#include "RaumServer.h"
#include "Backtrace.hpp"
#include <signal.h>
#include <stdio.h>

//#include <vld.h> 


Raumkern* raumkernObj;
RaumServerGUI gui;
bool guiEnabled;


void LogOutputStr(std::string _log)
{
	if (guiEnabled)
	{
		gui.AddLog(_log);
	}
	else
	{
		cout << _log.substr(0, rlutil::tcols() - 2) + "\n";
	}
}

void LogOutput(ApplicationLogging::LogData _logData)
{	
	LogOutputStr(Raumkern::GetLogString(_logData));
}



void Log(std::string _log)
{
	cout << _log + "\n";
}


void SystemReady()
{
	if (guiEnabled)
	{
		gui.SetRaumfeldSystemOnline(true);
	}
}

void SystemShutdown()
{
	if (guiEnabled)
	{
		gui.SetRaumfeldSystemOnline(false);
	}
}

void WebServerReady()
{
	if (guiEnabled)
	{
		gui.SetWebServerOnline(true);
	}
}

void WebServerStartFailed(std::string _error)
{
	if (guiEnabled)
	{
		gui.SetWebServerOnline(false);
		gui.SetWebServerStatus("Start failed!");
	}
}

void WebServerShutdown()
{
	if (guiEnabled)
	{
		gui.SetWebServerOnline(false);
	}
}

void ZoneConfigurationChanged()
{
	//cout << "Zone Configuration Changed\n";
}

void DeviceListChanged()
{
	//cout << "Device List changed\n";
}

void RendererStateChanged(std::string _rendererUDN)
{
	//cout << "Renderer State changed. Renderer: " << _rendererUDN << "\n";
}


RAUMSERVER_SETTINGS LoadSettings(std::string _path)
{
	xml_document<> doc;
	xml_node<> *applicationNode, *raumServerNode, *settingsNode;
	RAUMSERVER_SETTINGS	settings;

	settings.RAUMSERVER_UPDATEURL = "";
	settings.RAUMSERVER_USECONSOLEGUI = false;
	settings.SIGNALERROR_KEEPAVLIVE = false;
	settings.LOADED = false;

	if (_path.empty())
	{
		Log("No settings file was defined! System will not be able to start!");
		return settings;
	}

	std::ifstream settingsFileStream(_path.c_str());
	if (settingsFileStream.fail())
	{
		Log("Cannot open settings file '" + _path + "'");
		return settings;
	}

	std::vector<char> buffer((std::istreambuf_iterator<char>(settingsFileStream)), std::istreambuf_iterator<char>());
	buffer.push_back('\0');
	// Parse the buffer using the xml file parsing library into doc
	doc.parse<0>(&buffer[0]);

	// find the root node which has to be the 'Application' node	
	applicationNode = doc.first_node("Application", 0, false);
	if (!applicationNode)
	{
		Log("Settings file does not contain 'Application' node! (" + _path + ")");
		return settings;
	}

	// inside the 'ApplicationNode' we have to find the 'Raumserver' node where the settings for our Kernel are defined
	raumServerNode = applicationNode->first_node("Raumserver", 0, false);
	if (!raumServerNode)
	{
		Log("Settings file does not contain 'Raumserver' node! (" + _path + ")");
		return settings;
	}


	settingsNode = raumServerNode->first_node("ConsoleGUIEnabled", 0, false);
	if (settingsNode)
	{
		settings.RAUMSERVER_USECONSOLEGUI = std::stoi(settingsNode->value()) > 0 ? true : false;
	}

	settingsNode = raumServerNode->first_node("UpdateServer", 0, false);
	if (settingsNode)
	{
		settings.RAUMSERVER_UPDATEURL = settingsNode->value();
	}

	settingsNode = raumServerNode->first_node("KeepAliveOnSignalErrors", 0, false);
	if (settingsNode)
	{
		settings.SIGNALERROR_KEEPAVLIVE = std::stoi(settingsNode->value()) > 0 ? true : false;
	}

	settings.LOADED = true;

	return settings;
}


void ShowRoomInformation()
{
	boost::unordered_map<std::string, Raumkernel::RoomInformation> *roomInfoMap = raumkernObj->GetZoneManager()->GetRoomInformationMap();
	for (auto &mapItem : *roomInfoMap)
	{
		Raumkernel::RoomInformation roomInfo = mapItem.second;
		std::string info = "ROOM:  " + roomInfo.name + " (" + roomInfo.UDN + ")";
		LogOutputStr(info);
	}
}

void ShowNetworkAdapterInformation()
{
	std::vector<std::string> networkAdapterNameList = raumkernObj->GetAvailableNetworkAdapterNames();
	for (auto &name : networkAdapterNameList)
	{		
		std::string info = "NETWORK:  " + name;
		LogOutputStr(info);
	}
}


void fooA()
{
	//char  *x=nullptr;
	raise(SIGSEGV);
}

void fooB()
{
	fooA();
}


int main()
{	
	RAUMSERVER_SETTINGS appSettings;	
	char c = ' ';

	// register to signal handlers and print out nice stuff if signal error occurs!
	Backtrace::AddSignalHandlers();
	
	std::string settingsFilePath = "settings.xml";	
	std::string logFilePath = "application.log";

	appSettings = LoadSettings(settingsFilePath);
	if (!appSettings.LOADED)
	{
		Log("CRITICAL ERROR! RaumServer (v" + RAUMSERVER_VERSION + ") can not be started");
		return 0;
	}

	Backtrace::SIGNALERROR_KEEPALIVE = appSettings.SIGNALERROR_KEEPAVLIVE;
	guiEnabled = appSettings.RAUMSERVER_USECONSOLEGUI;

	// set up console gui
	if (guiEnabled)
	{

		gui.SetAppName("RaumServer");
		gui.SetAppVersion(RAUMSERVER_VERSION);
		gui.SetKernelName("RaumKernel");
		gui.SetKernelVersion(RAUMKERNEL_VERSION);
		gui.SetRaumfeldSystemOnline(false);
		gui.SetWebServerOnline(false);

		gui.Show();
	}
	

	raumkernObj = new Raumkern();
	raumkernObj->SetSettingsXMLFilePath(settingsFilePath);

	// we have to set logging. This logging will be used until the xml file is read!
	raumkernObj->GetLogger()->AddLogAdapter(LogAdapter::LOGADP_SIGNAL);
	raumkernObj->GetLogger()->AddLogAdapter(LogAdapter::LOGADP_FILE);
	raumkernObj->GetLogger()->SetLogFile(logFilePath);
	raumkernObj->GetLogger()->ClearLogFile();

	raumkernObj->SetLogLevel(LogType::LOGDEBUG); // will be used from the file if finished
	raumkernObj->SubscribeSignalLog(typeSignalRaumkernLog::slot_type(LogOutput));
	raumkernObj->SubscribeSignalSystemReady(typeSignalSystemReady::slot_type(SystemReady));	
	raumkernObj->SubscribeSignalSystemShutdown(typeSignalSystemShutdown::slot_type(SystemShutdown));

	raumkernObj->SubscribeSignalWebServerReady(typeSignalWebServerReady::slot_type(WebServerReady));
	raumkernObj->SubscribeSignalWebServerShutdown(typeSignalWebServerShutdown::slot_type(WebServerShutdown));	
	raumkernObj->SubscribeSignalWebServerStartFailed(typeSignalWebServerStartFailed::slot_type(WebServerStartFailed));

	raumkernObj->SubscribeSignalZoneConfigurationChanged(typeSignalZoneConfigurationChanged::slot_type(ZoneConfigurationChanged));
	raumkernObj->SubscribeSignaDeviceListChanged(typeSignalDeviceListChanged::slot_type(DeviceListChanged));
	raumkernObj->GetDeviceManager()->SubscribeSignalMediaRendererStateChanged(typeSignalMediaRendererStateChanged::slot_type(RendererStateChanged));
	raumkernObj->Init();

	// wait until the user presses an action button
	do
	{		
		c = rlutil::getkey();		
		
		// list room information as log info
		if (c == 'r')		
			ShowRoomInformation();	
		// list network adapter names
		if (c == 'n')
			ShowNetworkAdapterInformation();
		// segfault test O_o
		if (c == 'x')
			fooB();

		gui.SetCursorToInputPos();

	} while (c != rlutil::KEY_ESCAPE);

	delete raumkernObj;

	if (guiEnabled)
	{
		rlutil::cls();
		rlutil::showcursor();
		rlutil::locate(1, 1);
	}


	return 0;
}

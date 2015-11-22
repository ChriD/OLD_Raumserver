#include "RaumServerGUI.h"



RaumServerGUI::RaumServerGUI()
{
}

RaumServerGUI::~RaumServerGUI()
{
	// waiting for GUI printing thread to shut down
	if (showGUIThread.joinable())
	{
		showGUIThread.interrupt();
		showGUIThread.join();
	}
}

void RaumServerGUI::Sleep(boost::uint32_t _sleepMS)
{
	// boost sleep does segfault on linux! so we use c++11 sleep
	//boost::this_thread::sleep(boost::posix_time::milliseconds(_sleepMS));
	std::this_thread::sleep_for(std::chrono::microseconds(_sleepMS * 1000));
}

std::string RaumServerGUI::FillString(std::string _fillStr, boost::uint16_t _count)
{
	std::string result = "";

	for (boost::uint16_t i = 0; i < _count; i++)
	{
		result += _fillStr;
	}
	return result;
}

std::string RaumServerGUI::FillString(std::string _string, std::string _fillStr, boost::uint16_t _count)
{
	_string += this->FillString(_fillStr, _count);
	return _string;
}

// add log to the gui. This will be done in a thread to prevent locking due the log stack may be mutex locked by printing
void RaumServerGUI::AddLog(std::string _log)
{
	if (addLogThread.joinable())
		addLogThread.join();
	addLogThread = boost::thread(&RaumServerGUI::AddLogThread, this, _log);
}

void RaumServerGUI::AddLogThread(std::string _log)
{
	boost::uint16_t maxLogLines = rlutil::trows() - GUIHeaderHeight;

	boost::mutex::scoped_lock scopedLock(mutexlogStack);

	logStack.push_back(_log);
	while (logStack.size() > maxLogLines)
	{
		logStack.erase(logStack.begin());
	}

	logChanged = true;
}


void RaumServerGUI::ShowLog()
{
	// copy the stack to another var due not get to interfere with addlog method! 
	mutexlogStack.lock();
	std::vector<std::string> logStackLocal = logStack;
	mutexlogStack.unlock();

	std::vector<std::string>::iterator it;
	boost::uint16_t line = GUIHeaderHeight + 1;
	boost::uint16_t rowCount = rlutil::tcols();

	this->ShowFrame();
	this->UpdateHeaderView();

	rlutil::setColor(rlutil::DARKGREY);

	for (it = logStackLocal.begin(); it < logStackLocal.end(); it++)
	{
		std::string log = *it;
		if (log.length() >(boost::uint32_t)rlutil::tcols())
			log = log.substr(0, rlutil::tcols() - 1);
		else
			log = this->FillString(log, " ", rowCount - log.length());

		rlutil::locate(1, line); std::cout << log;
		line++;

		boost::this_thread::interruption_point();
	}

	this->SetCursorToInputPos();
}


void RaumServerGUI::Clear(boost::uint16_t _fromLine, boost::uint16_t _toLine, boost::uint16_t _fromCol, boost::uint16_t _toCol)
{
	std::string empty = this->FillString(" ", _toCol - _fromCol);

	for (boost::uint16_t i = _fromLine; i <= _toLine; i++)
	{
		rlutil::locate(_fromCol, i); std::cout << empty;
	}
	
}


void RaumServerGUI::Show()
{
	rlutil::cls();
	rlutil::hidecursor();	

	this->ShowFrame();

	showGUIThread = boost::thread(&RaumServerGUI::ShowThread, this);
}


void RaumServerGUI::ShowThread()
{
	boost::mutex::scoped_lock scoped_lockUpnp(mutexPrintGUI);
	
	try
	{
		do
		{

			if (headerChanged)
			{
				headerChanged = false;
				this->UpdateHeaderView();
			}

			boost::this_thread::interruption_point();

			if (logChanged)
			{
				logChanged = false;
				this->ShowLog();
			}

			boost::this_thread::interruption_point();

			this->Sleep(50);	

			boost::this_thread::interruption_point();
		} 
		while (1 == 1);
	}
	catch (boost::thread_interrupted const&)
	{
		// thread interrupted... 
	}
}


void RaumServerGUI::SetCursorToInputPos()
{
	rlutil::locate(1, 1);
	rlutil::locate(rlutil::tcols() - 1, 6);
}


void RaumServerGUI::ShowFrame()
{
	boost::uint16_t columCount = rlutil::tcols();
	std::string	headerLine = this->FillString("#", columCount);
	std::string	endLine = this->FillString("#", columCount);

	rlutil::setColor(rlutil::WHITE);

	// show above line
	rlutil::locate(1, 1); std::cout << headerLine;

	// show middle lines
	for (boost::uint16_t line = 2; line <= GUIHeaderHeight - 1; line++)
	{
		rlutil::locate(1, line); std::cout << "#";
		rlutil::locate(columCount, line); std::cout << "#";
	}

	// show ending line before log output
	rlutil::locate(1, GUIHeaderHeight); std::cout << endLine;
}


void RaumServerGUI::ShowHeader()
{
	this->ShowFrame();
	this->UpdateHeaderView();
}


void RaumServerGUI::UpdateHeaderView()
{
	this->Clear(2, GUIHeaderHeight - 1, 2, rlutil::tcols() - 1);
	//this->ShowFrame();
	this->ShowRaumServerInfo();
	this->ShowRaumfeldStatus();
	this->ShowWebServerStatus();
	this->ShowActionKeys();

	this->SetCursorToInputPos();
}


void RaumServerGUI::ShowRaumServerInfo()
{	
	rlutil::setColor(rlutil::LIGHTCYAN);
	rlutil::locate(3, 3); std::cout << appName + " v" + appVersion;

	rlutil::setColor(rlutil::DARKGREY);
	std::cout << " (using RaumKernel v" + kernelVersion + ")";
}

void RaumServerGUI::ShowRaumfeldStatus()
{
	rlutil::setColor(rlutil::WHITE);
	rlutil::locate(3, 5); std::cout << "Raumfeld System: ";

	if (raumfeldSystemOnline)
	{
		rlutil::setColor(rlutil::LIGHTGREEN);
		std::cout << "found";
	}
	else
	{
		rlutil::setColor(rlutil::LIGHTRED);
		std::cout << "not found";
	}
}

void RaumServerGUI::SetWebServerStatus(std::string _statusText)
{
	webServerStatusText = _statusText;
}

void RaumServerGUI::ShowActionKeys()
{
	std::string keyText = "[r] list rooms, [n] list network adapters, [ESC] to quit!";
	rlutil::setColor(rlutil::DARKGREY);
	//rlutil::locate(rlutil::tcols() - keyText.length() - 1, GUIHeaderHeight - 2); std::cout << keyText;
	rlutil::locate(3, GUIHeaderHeight - 2); std::cout << keyText;
}

void RaumServerGUI::ShowWebServerStatus()
{
	rlutil::setColor(rlutil::WHITE);
	rlutil::locate(3, 6); std::cout << "Webserver status: ";

	if (webServerOnline)
	{
		rlutil::setColor(rlutil::LIGHTGREEN);
		std::cout << "startet";
	}
	else
	{
		rlutil::setColor(rlutil::LIGHTRED);
		std::cout << "not started";
	}

	if (!webServerStatusText.empty())
	{
		rlutil::setColor(rlutil::DARKGREY);
		std::cout << " (" + webServerStatusText + ")";
	}
}



void RaumServerGUI::SetAppName(std::string _appName)
{
	appName = _appName;
	headerChanged = true;
}

void RaumServerGUI::SetAppVersion(std::string _appVersion)
{
	appVersion = _appVersion;
	headerChanged = true;
}

void RaumServerGUI::SetKernelName(std::string _kernelName)
{
	kernelName = _kernelName;
	headerChanged = true;
}

void RaumServerGUI::SetKernelVersion(std::string _kernelVersion)
{
	kernelVersion = _kernelVersion;
	headerChanged = true;
}

void RaumServerGUI::SetRaumfeldSystemOnline(bool _online)
{
	raumfeldSystemOnline = _online;
	headerChanged = true;
}

void RaumServerGUI::SetWebServerOnline(bool _online)
{
	webServerOnline = _online;
	headerChanged = true;
}
#ifndef RAUMSERVERGUI_H
#define RAUMSERVERGUI_H

#include <iostream>
#include <string>
#include <cstdio>
#include <vector>
#include <stack>
#include <chrono>
#include <thread>

#include <boost/cstdint.hpp>
#include <boost/thread.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>

#include "rlutil.h"

using namespace std;

const boost::uint8_t GUIHeaderHeight = 10;


class RaumServerGUI
{
	public:
		RaumServerGUI();
		virtual ~RaumServerGUI();

		void Show();
		void AddLog(std::string _log);	
		void UpdateHeaderView();		

		void SetAppName(std::string _appName);
		void SetAppVersion(std::string _appVersion);
		void SetKernelName(std::string _kernelName);
		void SetKernelVersion(std::string _kernelVersion);
		void SetRaumfeldSystemOnline(bool _online);
		void SetWebServerOnline(bool _online);
		void SetWebServerStatus(std::string _statusText);
		void SetCursorToInputPos();

	protected:
		std::string FillString(std::string _fillStr, boost::uint16_t _count);
		std::string FillString(std::string _string, std::string _fillStr, boost::uint16_t _count);

		void ShowHeader();
		void ShowFrame();
		void ShowRaumServerInfo();
		void ShowLog();
		void ShowActionKeys();

		void ShowRaumfeldStatus();
		void ShowWebServerStatus();

		void Sleep(boost::uint32_t _sleepMS);

		void AddLogThread(std::string _log);
		void ShowThread();

		void Clear(boost::uint16_t _fromLine, boost::uint16_t _toLine, boost::uint16_t _fromCol = 1, boost::uint16_t _toCol = rlutil::tcols());

		std::vector<std::string> logStack;

		boost::mutex	mutexPrintGUI;
		boost::mutex	mutexlogStack;

		boost::thread	addLogThread;
		boost::thread	showGUIThread;
		
	private:

		std::string appName;
		std::string appVersion;
		std::string kernelName;
		std::string kernelVersion;

		bool raumfeldSystemOnline;
		bool webServerOnline;
		std::string webServerStatusText;

		bool logChanged;
		bool headerChanged;		
};

#endif // RAUMSERVERGUI_H 
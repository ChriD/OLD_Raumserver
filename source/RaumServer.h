#ifndef RAUMSERVER_H
#define RAUMSERVER_H

#include <iostream>
#include <string>
#include <cstdio>
#include <vector>
#include <stdio.h>
#include <signal.h>

#include <boost/cstdint.hpp>
#include <Raumkern.h>

#include "rlutil.h"
#include <rapidxml/rapidxml.hpp>
#include "RaumServerGUI.h"


using namespace std;

const std::string RAUMSERVER_VERSION = "0.1.10.97";

struct RAUMSERVER_SETTINGS
{
	std::string RAUMSERVER_UPDATEURL;
	bool RAUMSERVER_USECONSOLEGUI;
	bool LOADED;
	bool SIGNALERROR_KEEPAVLIVE;
};



#endif // RAUMSERVER_H 
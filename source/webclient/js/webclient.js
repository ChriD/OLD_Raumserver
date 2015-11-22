

var isOnline = false;
// actual zone information object. contain all zones with assigned rooms and an "empty zone" for all unassigned rooms
var zoneInformationObject;
// actual zone playlist objects. contains the actual playlist for all zones given
var zonePlaylistObject;
// actual renderer state object. contains current track, duration aso for all virtual rendereres
var zoneRendererStateObject;
// actual browser list. contains actual content manager browser list
var browserListObject;
// ajax request pool array hich contains all open, not finished ajax request
var xhrPool = [];
// array which holds all compiled templates
var compiledTemplates = [];
// unique session id
var sessionId = "";
// current selected zone
var currentSelectedZoneUDN = "";


$(document).ready(
	function() 
	{
	    sessionId = generateGUID();
	    console.log("generate unique session id: " + sessionId);
	    SetupAjax();
	    CompileTemplates();
		SetWebClientOnlineStatus(false, true);		
		// if the document is ready we have to start up some long polling action
		// this methods will call itself in its success or error method.		
		StartLongPollingZoneInformation("");	
		StartLongPollingZoneRendererState("");	
		StartLongPollingZonePlaylist("", "");		        
	}
);


function AbortRequests()
{
    console.log("Abort requests");
    $.ajax({
        url: "../json/abortRequests?id=" + sessionId,
        cache: false,
        async: false
    });
}


function CompileTemplates()
{
    console.log("Compile templates");
    compiledTemplates['zoneInformationTemplate'] = Handlebars.compile($("#zoneInformationTemplate").html());
    compiledTemplates['zonePlaylistItemTemplate'] = Handlebars.compile($("#zonePlaylistItemTemplate").html());
    compiledTemplates['zoneManagementZoneTemplate'] = Handlebars.compile($("#zoneManagementZoneTemplate").html());
    compiledTemplates['zoneManagementRoomTemplate'] = Handlebars.compile($("#zoneManagementRoomTemplate").html());
    compiledTemplates['zoneManagementUnassignedRoomTemplate'] = Handlebars.compile($("#zoneManagementUnassignedRoomTemplate").html());
    compiledTemplates['zoneChoosementBlockTemplate'] = Handlebars.compile($("#zoneChoosementBlockTemplate").html());    
};

function SetupAjax()
{
    console.log("Setting up ajax request pool");
	$(document).ajaxSend(function(e, jqXHR, options){ 
		xhrPool.push(jqXHR); } 
	);
	  	  
	$(document).ajaxComplete(function(e, jqXHR, options){ 
		xhrPool = $.grep(xhrPool, function(x){
			return x!=jqXHR}
			);}
	);
	  
	var abort = function() {
	$.each(xhrPool, function(idx, jqXHR) {
		jqXHR.abort();
	});
	};

	var oldbeforeunload = window.onbeforeunload;
	window.onbeforeunload = function() {
	var r = oldbeforeunload ? oldbeforeunload() : undefined;
	if (r == undefined)
	{
		// only cancel requests if there is no prompt to stay on the page
	    // if there is a prompt, it will likely give the requests enough time to finish
	    AbortRequests(sessionId);
		abort();
	}
	return r;
	}
}


function StartLongPollingZoneInformation(updateId)
{
    console.log("Start zone information request [POLL]");
	$.ajax({
		url: "../json/getzonelist",
		cache: false,
		beforeSend: function (request)
		{
		    request.setRequestHeader("updateID", updateId);
		    request.setRequestHeader("sessionID", sessionId);
		},
		success: function(res, status, xhr) 
		{		
		    try
            {
			    // we successfully got a response of the long polling section, we know now that the RaumServer
			    // is online and so we set the website state back to "online". Further on we are drawing the new 
		        // zone list we got and we do restart of the long polling request
		        console.log("zone information request returned [POLL]");
		        SetWebClientOnlineStatus(true);
			    UpdateZoneInformationObject(res);
			    StartLongPollingZoneInformation(xhr.getResponseHeader("updateID"));
		    }
		    catch (err)
	        {
		        exception(err);
	        }
		},
		error: function(xhr, textStatus, errorThrown)
		{
			// if there was an error getting the zone information then wait a little bit and try it again
		    // we set the status of the page to "not online"
		    console.log("ERROR on zone information request [POLL]");
			SetWebClientOnlineStatus(false);
			setTimeout(function(){StartLongPollingZoneInformation(""); }, 3000);							
		}
	});	
};

function StartLongPollingZoneRendererState(updateId)
{
    console.log("Start zone renderer state request [POLL]");
	$.ajax({
		url: "../json/getrendererstate",
		cache: false,
		beforeSend: function (request)
		{
		    request.setRequestHeader("updateID", updateId);
		    request.setRequestHeader("sessionID", sessionId);
		},
		success: function(res, status, xhr) 
		{
		    try
		    {
		        console.log("zone renderer state request returned [POLL]");
		        SetWebClientOnlineStatus(true);
		        UpdateZoneRendererStateObject(res);
		        StartLongPollingZoneRendererState(xhr.getResponseHeader("updateID"));
		    }
		    catch (err)
		    {
		        exception(err);
		    }
		},
		error: function(xhr, textStatus, errorThrown)
		{
		    console.log("ERROR on zone renderer state request [POLL]");
			SetWebClientOnlineStatus(false);
			setTimeout(function(){StartLongPollingZoneRendererState(""); }, 3000);							
		}
	});	
};

function StartLongPollingZonePlaylist(zoneUDN, updateId)
{
    console.log("Start zone playlist request [POLL]");
	$.ajax({
		url: "../json/getzoneplaylist", //?zoneUDN=" + encodeURIComponent(zoneUDN),	
		cache: false,
		beforeSend: function (request)
		{
		    request.setRequestHeader("updateID", updateId);
		    request.setRequestHeader("sessionID", sessionId);
		},
		success: function(res, status, xhr) 
		{
		    console.log("playlist request returned [POLL]");
			SetWebClientOnlineStatus(true);
			UpdateZonePlaylistObject(res);
			StartLongPollingZonePlaylist("", xhr.getResponseHeader("updateID"));	
		},
		error: function(xhr, textStatus, errorThrown)
		{
		    console.log("ERROR on zone playlist request [POLL]");
			SetWebClientOnlineStatus(false);
			setTimeout(function(){StartLongPollingZonePlaylist("", ""); }, 3000);							
		}
	});	
};

function StartZonePlaylistRequest()
{
    console.log("Start zone playlist request [SINGLE]");
    $.ajax({
        url: "../json/getzoneplaylist",	
        cache: false,
        beforeSend: function (request)
        {
            request.setRequestHeader("sessionID", sessionId);
        },
        success: function (res, status, xhr)
        {
            console.log("playlist request returned [SINGLE]");
            SetWebClientOnlineStatus(true);
            UpdateZonePlaylistObject(res);
        },
        error: function (xhr, textStatus, errorThrown)
        {
            console.log("ERROR on zone playlist request [SINGLE]");
            SetWebClientOnlineStatus(false);     
        }
    });
}


function SetWebClientOnlineStatus(_isOnline, _force)
{   
    if (isOnline != _isOnline || _force)
    {
        console.log("client status change");
        if (_isOnline) { OnWebClientOnline(); }
        else{OnWebClientOffline();}
    }
    isOnline = _isOnline;
}

function OnWebClientOnline()
{
    console.log("client is going online");
    $('.offlineMarker').fadeOut();
    $('.onlineMarker').fadeIn();
}

function OnWebClientOffline()
{
    console.log("client is going offline");
    $('.offlineMarker').fadeIn();
    $('.onlineMarker').fadeOut();
}


function UpdateZonePlaylistObject(data)
{
    try
    {
        zonePlaylistObject = $.parseJSON(data);
        DrawZonePlaylist(zonePlaylistObject);
        MarkCurrentPlayingTrackItem();
    }
	catch (err)
    {
	    exception(err);
    }
}

function UpdateZoneRendererStateObject(data)
{
    try
    {   
        zoneRendererStateObject = $.parseJSON(data);
        DrawZoneRendererState(zoneRendererStateObject);
        DrawZoneManagementContainer(zoneInformationObject);
        DrawZoneChoosement(zoneInformationObject);
        DrawZonePlaylist(zonePlaylistObject);
        MarkCurrentPlayingTrackItem();
    }
	catch (err)
	{        
	    exception(err);
    }
}

function UpdateZoneInformationObject(data)
{
    try
    {
        zoneInformationObject = $.parseJSON(data);
   
        if (isEmpty(currentSelectedZoneUDN))
        {
            currentSelectedZoneUDN = zoneInformationObject.zone[0].zoneUDN;
        }
  
        DrawZoneManagementContainer(zoneInformationObject);
        DrawZoneChoosement(zoneInformationObject);        
    }
	catch (err)
    {
	    exception(err);
    }
    // when zone information changes we do a single request for the zone playlist to get new value because long polling wont 
    // do this for us in this case because no playlist may have been changed but we do want to update 
    StartZonePlaylistRequest();
}



//////////////////////////
// COMMON STUFF FUNCTIONS
/////////////////////////

function exception(exception)
{
    //alert(exception.message + "\n\n" + exception.stack);
    console.log("EXCEPTION: " + exception.message + "\n\n" + exception.stack);
}


function buildTrackId(zoneUDN, trackNumber)
{
    return zoneUDN + ":" + trackNumber;
}


function isEmpty(str)
{
    return (!str || 0 === str.length || str == " ");
};



function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
      function (c) {
          var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      }).toUpperCase();
};


function GetContentObjectForZoneRenderer(_zoneUDN) {
    // TODO: @@@
    var volume = 0;
    var trackNr = 0;
    var zoneUDN = "";
    var zoneName = "";
    var trackDuration = "";
    var trackCount = 0;
    var contentType = "";
    var bitrate = 0;
    var transportState = "";
    var muteState = "";
    var trackTitle = "";
    var trackAlbum = "";
    var trackArtist = "";
    var trackArtistArtUri = "";
    var trackAlbumArtUri = "";

    if (!zoneRendererStateObject || zoneRendererStateObject.length == 0)
    { }
    else
    {
        var zoneRendererCount = zoneRendererStateObject.rendererState.length;
        for (var i = 0; i < zoneRendererCount; i++) {
            if (zoneRendererStateObject.rendererState[i].zoneUDN == _zoneUDN) {
                volume = zoneRendererStateObject.rendererState[i].volume;
                trackNr = zoneRendererStateObject.rendererState[i].trackNr;
                zoneUDN = zoneRendererStateObject.rendererState[i].zoneUDN;
                zoneName = zoneRendererStateObject.rendererState[i].zoneName;
                trackDuration = zoneRendererStateObject.rendererState[i].trackDuration;
                trackCount = zoneRendererStateObject.rendererState[i].trackCount;
                contentType = zoneRendererStateObject.rendererState[i].contentType;
                bitrate = zoneRendererStateObject.rendererState[i].bitrate;
                transportState = zoneRendererStateObject.rendererState[i].transportState;
                muteState = zoneRendererStateObject.rendererState[i].muteState;
                trackTitle = unescape(zoneRendererStateObject.rendererState[i].trackTitle);
                trackAlbum = unescape(zoneRendererStateObject.rendererState[i].trackAlbum);
                trackArtist = unescape(zoneRendererStateObject.rendererState[i].trackArtist);
                trackArtistArtUri = zoneRendererStateObject.rendererState[i].trackArtistArtUri;
                trackAlbumArtUri = zoneRendererStateObject.rendererState[i].trackAlbumArtUri;
                //alert(trackNr);
            }
        }
    }

    //trackDuration = trackDuration.slice(0, 7);

    var context = {
        albumArtUri: trackAlbumArtUri,
        album: trackAlbum,
        artist: trackArtist,
        title: trackTitle,
        duration: trackDuration,
        zoneName: zoneName,
        zoneUDN: zoneUDN,
        transportState: transportState,
        trackNumber: trackNr
    };

    return context;
}





//////////////////////////
// ZONE MANAGEMENT FUNCTIONS
/////////////////////////

function SelectCurrentZone(zoneUDN)
{
    try
    {
        console.log("Select zone: " + zoneUDN);
        currentSelectedZoneUDN = zoneUDN;
        // redraw some stuff
        DrawZoneRendererState(zoneRendererStateObject);
        DrawZoneChoosement(zoneInformationObject);
        DrawZonePlaylist(zonePlaylistObject);
        MarkCurrentPlayingTrackItem();
    }
	catch (err)
	{
	    exception(err);	    
    }
}


function roomDroppedOnZone(dropObject, dropArea)
{
    console.log("Room dropped on zone");
    if ($(dropObject).is(".dragRoom")) {
        var dropAreaObject = jQuery(dropArea);
        var roomUDN = dropObject.attr("id");
        var zoneUDN = dropAreaObject.attr("id");
        AddRoomToZone(roomUDN, zoneUDN);
    }
};

function LockZoneManagementControl(lock) {
    LockControl($('#zoneManagementControl'), lock);
};

function CreateZoneForRoom(roomUDN)
{
    console.log("Create zone for room");
    var requestAction = "../room/" + roomUDN + "/createZone?force=true&2wait=1";
    LockZoneManagementControl(true);
    $.ajax({ url: requestAction, cache: false });
};

function AddRoomToZone(roomUDN, zoneUDN)
{
    console.log("Add room to zone");
    if (isEmpty(zoneUDN)) {
        DropRoomFromZone(roomUDN);
    }
    else {
        var requestAction = "../room/" + roomUDN + "/addToZone?zone=" + encodeURIComponent(zoneUDN) + "&wait=1";
        LockZoneManagementControl(true);
        $.ajax({ url: requestAction, cache: false });
    }
};

function DropRoomFromZone(roomUDN)
{
    console.log("Drop room from zone");
    var requestAction = "../room/" + roomUDN + "/dropFromZone?wait=1";
    LockZoneManagementControl(true);
    $.ajax({ url: requestAction, cache: false });
};



//////////////////////////
// RENDERER FUNCTIONS
/////////////////////////

function PlayNext(zoneUDN) {
    console.log("Renderer: playNext");
    var requestAction = "../zone/" + zoneUDN + "/playNext?wait=1";
    // TODO: Lock	
    $.ajax({ url: requestAction, cache: false });
};

function PlayPrev(zoneUDN) {
    console.log("Renderer: playPrev");
    var requestAction = "../zone/" + zoneUDN + "/playPrev?wait=1";
    // TODO: Lock	
    $.ajax({ url: requestAction, cache: false });
};

function PlayPause(zoneUDN) {
    console.log("Renderer: playPause");
    var content = GetContentObjectForZoneRenderer(zoneUDN)
    var requestAction = "";

    if(content.transportState == "PLAYING")
        requestAction = "../zone/" + zoneUDN + "/pause?wait=1";
    else
        requestAction = "../zone/" + zoneUDN + "/play?wait=1";       
    // TODO: Lock	
    $.ajax({ url: requestAction, cache: false });
};

function PlayTrack(zoneUDN, trackNumber) {
    console.log("Renderer: playTrack: ");
   // alert("paylTrack");
    var requestAction = "../zone/" + zoneUDN + "/play?wait=1&track=" + trackNumber;
    // TODO: Lock	
    $.ajax({ url: requestAction, cache: false });
};


//////////////////////////
// DRAWING FUNCTIONS
/////////////////////////

function LockControl(control, lock)
{
    if (lock) {
        control.waitMe({
            //none, rotateplane, stretch, orbit, roundBounce, win8,
            //win8_linear, ios, facebook, rotation, timer, pulse,
            //progressBar, bouncePulse or img
            effect: 'pulse',
            //place text under the effect (string).
            text: '',
            //background for container (string).
            bg: 'rgba(255,255,255,0.5)',
            //color for background animation and text (string).
            color: '#000',
            //change width for elem animation (string).
            sizeW: '',
            //change height for elem animation (string).
            sizeH: '',
            // url to image
            source: ''
        });
    }
}


function DrawZoneManagementContainer(_jsonData)
{
    console.log("Drawing zone management container");

    var jsonDataZoneInformation = _jsonData;

    if (!jsonDataZoneInformation)
        return;

    var html = "";

    var htmlMenuAssignedRooms = "";
    var htmlMenuUnAssignedRooms = "";
    var htmlAvailableZonesList = "";

    var zoneCount = jsonDataZoneInformation.zone.length;

    var zoneTemplate = compiledTemplates['zoneManagementZoneTemplate'];
    var roomTemplate = compiledTemplates['zoneManagementRoomTemplate'];
    var unassignedRoomTemplate = compiledTemplates['zoneManagementUnassignedRoomTemplate'];

    // run through zones and create list item each zone. Each zone also has a sublist with the rooms attached to the zone	
    for (var i = 0; i < zoneCount; i++)
    {
        var roomCount = jsonDataZoneInformation.zone[i].rooms.length;
        var zoneUDN = jsonDataZoneInformation.zone[i].zoneUDN;  
      
        var context = GetContentObjectForZoneRenderer(zoneUDN);
        context["zoneName"] = jsonDataZoneInformation.zone[i].zoneName;
        context["zoneUDN"] = zoneUDN;        

        html += zoneTemplate(context);

        console.log("Generated Code for Zone " + zoneUDN);
         
        for (var z = 0; z < roomCount; z++)
        {
            // create dropdown html code
            htmlAvailableZonesList = "";
            for (var y = 0; y < zoneCount; y++) {
                var zoneUDNLoc = jsonDataZoneInformation.zone[y].zoneUDN;
                if (!isEmpty(zoneUDNLoc) && zoneUDNLoc != zoneUDN)
                    htmlAvailableZonesList += "<li id=\"" + jsonDataZoneInformation.zone[y].zoneUDN + "\"><a href=\"#\" onclick=\"AddRoomToZone('" + jsonDataZoneInformation.zone[i].rooms[z].roomUDN + "','" + jsonDataZoneInformation.zone[y].zoneUDN + "');return false;\">Add to \"" + jsonDataZoneInformation.zone[y].zoneName + "\"</a></li>";
            }
            htmlMenuUnAssignedRooms = "<ul><li class=\"roomName\">" + jsonDataZoneInformation.zone[i].rooms[z].roomName + "</li><li><a href=\"#\" onclick=\"CreateZoneForRoom('" + jsonDataZoneInformation.zone[i].rooms[z].roomUDN + "');return false;\">Create Zone</a></li>" + htmlAvailableZonesList + "</ul>";
            htmlMenuAssignedRooms = "<ul><li class=\"roomName\">" + jsonDataZoneInformation.zone[i].rooms[z].roomName + "</li><li><a href=\"#\" onclick=\"CreateZoneForRoom('" + jsonDataZoneInformation.zone[i].rooms[z].roomUDN + "');return false;\">Create Zone</a></li><li><a href=\"#\" onclick=\"DropRoomFromZone('" + jsonDataZoneInformation.zone[i].rooms[z].roomUDN + "');return false;\">Drop</a></li>" + htmlAvailableZonesList + "</ul>";   

            var roomContext = {               
                roomUDN: jsonDataZoneInformation.zone[i].rooms[z].roomUDN,
                roomName: jsonDataZoneInformation.zone[i].rooms[z].roomName,
                htmlMenuAssigned: htmlMenuAssignedRooms,
                htmlMenuUnAssigned: htmlMenuUnAssignedRooms
            };

            if (isEmpty(zoneUDN))
                html += unassignedRoomTemplate(roomContext);
            else
                html += roomTemplate(roomContext);

            console.log("Generating Code for Room " + jsonDataZoneInformation.zone[i].rooms[z].roomUDN);                    
        }
    }

    $('#zoneManagementControl').html(html);


    // TODO: @@@
    $('.roomMenu').dropit();




    // http://jsfiddle.net/fhamidi/fKde3/
    $('.dragRoom').draggable({
        revert: function (dropped) { return !dropped; },
        helper: "clone",
        cursor: "move",
        opacity: 0.70,
    });
    $('.dropZone').droppable({
        drop: function (event, ui) {
            roomDroppedOnZone(ui.draggable, this);
        }
    });

};


function DrawZoneRendererState(_data) {
    // TODO: For now draw states of all zones, but in future only draw currently seleceted zone state?!

    console.log("Drawing renderer container");

    // the resolution we get here is a string data which we have to convert to a JSON object
    var jsonDataZoneInformation = _data;
    var template = compiledTemplates['zoneInformationTemplate'];
    var html = "";

    // run through zones and create list item each zone. Each zone also has a sublist with the rooms attached to the zone
    var zoneRendererCount = jsonDataZoneInformation.rendererState.length;
    for (var i = 0; i < zoneRendererCount; i++)
    {
        if (currentSelectedZoneUDN == jsonDataZoneInformation.rendererState[i].zoneUDN)
        {

            var context = GetContentObjectForZoneRenderer(jsonDataZoneInformation.rendererState[i].zoneUDN);
            //alert("a");

            console.log("Drawing container for zone " + jsonDataZoneInformation.rendererState[i].zoneUDN);

            html += template(context);
            html += "<br><br>";
        }

    }

    $('#zoneRendererView').html(html);

};


function DrawZonePlaylist(_zonePlaylistObject)
{
    console.log("Drawing zone playlists");

    if (!_zonePlaylistObject || _zonePlaylistObject.length == 0)
        return;

    var html = "";
    var playlistCount = _zonePlaylistObject.zonePlaylist.length;
    var playlistHTMLMarkerId = "";
    var template = compiledTemplates['zonePlaylistItemTemplate'];

    for (var i = 0; i < playlistCount; i++)
    {
        html = "";
        // check if HTML Marker exists for playlist. If its exists then draw, otherwise skip!
        playlistHTMLMarkerId = "#zonePlaylist" + _zonePlaylistObject.zonePlaylist[i].zoneUDN;
        var playlistObjects = $(".zonePlaylist");
        if (playlistObjects.length > 0)
        {
            $.each(playlistObjects, function (index, item){
                var zoneUDN = jQuery(item).data("id");
                if (zoneUDN == _zonePlaylistObject.zonePlaylist[i].zoneUDN)
                {
                    var mediaItemCount = _zonePlaylistObject.zonePlaylist[i].playlistItem.length;
                    for (var z = 0; z < mediaItemCount; z++) {    
                            
                        var trackDuration = _zonePlaylistObject.zonePlaylist[i].playlistItem[z].duration;
                        trackDuration = trackDuration.slice(0, 7);

                        var album   = unescape(_zonePlaylistObject.zonePlaylist[i].playlistItem[z].album);
                        var artist  = unescape(_zonePlaylistObject.zonePlaylist[i].playlistItem[z].artist);
                        var title = unescape(_zonePlaylistObject.zonePlaylist[i].playlistItem[z].title);

                        if (isEmpty(album))     album   = "Unbekanntes Album";
                        if (isEmpty(artist))    artist  = "Unbekanntes Interpret";
                        if (isEmpty(title))     title   = "Unbekannter Titel";

                        trackId = buildTrackId(_zonePlaylistObject.zonePlaylist[i].zoneUDN, z + 1);                     

                        var context = {
                            album: album,
                            artist: artist,
                            title: title,
                            zoneUDN: _zonePlaylistObject.zonePlaylist[i].zoneUDN,
                            trackNumber: z+1,
                            duration: trackDuration,
                            trackId: trackId
                        };

                        html += template(context);
                    }            
                    jQuery(item).html(html);
                }               
            });            
        }
    }
  
};


function DrawZoneChoosement(_jsonData)
{
    console.log("Drawing zone choosement");

    if (!_jsonData)
        return

    var jsonDataZoneInformation = _jsonData;
    var zoneCount = jsonDataZoneInformation.zone.length;
    var zoneChoosementBlockTemplate = compiledTemplates['zoneChoosementBlockTemplate'];
    var html = "";


    // run through zones and create list item each zone	
    for (var i = 0; i < zoneCount; i++)
    {
        var zoneUDN = jsonDataZoneInformation.zone[i].zoneUDN;
        if (!isEmpty(zoneUDN))
        {
            var context = GetContentObjectForZoneRenderer(zoneUDN);         
            context["zoneName"] = jsonDataZoneInformation.zone[i].zoneName;
            context["zoneUDN"] = zoneUDN;
            if (zoneUDN == currentSelectedZoneUDN)
                context["htmlClass"] = "zoneChoosementBlockSelected";
            else
                context["htmlClass"] = "";            
            html += zoneChoosementBlockTemplate(context);    
        }
    }
    $('#zoneChoosement').html(html);
};


function MarkCurrentPlayingTrackItem()
{
    // get current track number of current zoe which is playing
    // TODO: @@@
    if (isEmpty(currentSelectedZoneUDN))
        return;
    var context = GetContentObjectForZoneRenderer(currentSelectedZoneUDN);

    if (context.trackNumber > 0) {

        var trackId = buildTrackId(context.zoneUDN, context.trackNumber);
        
        /*
        var trackContainer = $('#' + trackId);
        if (trackContainer)
        {
            trackContainer.addClass("playlistItemContainerCurrent");
        }
        */
        
        
        var playlistObjects = $(".playlistItemContainer");
        if (playlistObjects.length > 0) 
        {
            $.each(playlistObjects, function (index, item)
            {
                var trackIdFound = jQuery(item).data("id");
                if (trackIdFound == trackId)
                {
                    jQuery(item).addClass("playlistItemContainerCurrent");
                }
            })
        }
        
    }

    

    //alert(trackId);

    // remove marking of old one

    // add marking to new one
    //$('#zoneChoosement').addClass("playlistItemContainerIsCurrent");

   
};


    /*
    function ContentManagerBrowseTo(containerId)
    {
    $.ajax({
            url: "../json/getcontainerlist?cid=" + containerId + "&useCache=0",
            cache: false,
            success: function(res, status, xhr) 
                {						
                    SetWebClientOnlineStatus(true);
                    UpdateBrowserListObject(res);
                },
            error: function(xhr, textStatus, errorThrown)
                {	
                    SetWebClientOnlineStatus(false);				
                }
            });	
    }
    
    
    
    
    
    function UpdateBrowserListObject(data) 
    {
        browserListObject = $.parseJSON(data);;
    }
    
    
    
    function DrawZonePlaylist(zoneUDN) 
    {	
        var html = "";
        var playlistCount = zonePlaylistObject.zonePlaylist.length;
        
        for (var i=0; i<playlistCount; i++) 
        {
            html += "<b>" + zonePlaylistObject.zonePlaylist[i].zoneUDN + "</b><br>"; 
            var mediaItemCount = zonePlaylistObject.zonePlaylist[i].playlistItem.length;
            for (var z=0; z<mediaItemCount; z++) 
            {	
                html += unescape(zonePlaylistObject.zonePlaylist[i].playlistItem[z].title) + "<br>";
                //html += zonePlaylistObject.zonePlaylist[i].playlistItem[z].title + "<br>";
            }
            html += "<br><br>";		
        }
        //alert(playlistCount);
        
        $('.playlistViewAll').html(html);
    }
    
    
    */


    // http://jsfiddle.net/2LN5G/18/

    /*
    function allowDrop(ev) {
        ev.preventDefault();
    }
    
    function drag(ev) {
        ev.dataTransfer.setData("roomUDN", ev.target.id);
    }
    
    function drop(ev) {
        ev.preventDefault();
        var roomUDN = ev.dataTransfer.getData("roomUDN");
        var zoneUDN = ev.target.id;
        
        AddRoomToZone(roomUDN, zoneUDN);
        //ev.target.appendChild(document.getElementById(data));
        //alert(ev.target.id);
        //alert(data);
    }
    */


const Track = require('./track.js');
var request = require('request');

//test
module.exports = class Playlist {
    constructor(name, trackPaging, id) {
        this.name = name;
        this.id = id;
        this.tracksLink = trackPaging.href;
        this.trackArray = [];
        this.complete = false;
      }

    addTracks(access_token, callback){

        var options = {
            url: this.tracksLink,
            headers: { 'Authorization': 'Bearer ' + access_token}
            };
        var self = this;

        request.get(options, function(error, response, body){

            if(error){
                console.log(error);
            }

            var parsed = JSON.parse(body);
            var parsedItems = parsed.items;

           // console.log(parsedItems);



            var newArr = [];
            parsedItems.forEach(function(track){

                var tempTrack = new Track(track.track.name, track.track.id, track.track.uri);

                //console.log(tempTrack.uri);
                newArr.push(tempTrack);

            })

            self.trackArray = newArr;
            //console.log("FINISHED");
            //console.log(self.trackArray[6].name);
            callback();

        });


    }


  };

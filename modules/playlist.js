const Track = require('./track.js');
var request = require('request');


module.exports = class Playlist {
    constructor(name, trackPaging) {
        this.name = name;
        this.tracksLink = trackPaging.href;
      }

    addTracks(access_token){

        var options = {
            url: this.tracksLink,
            headers: { 'Authorization': 'Bearer ' + access_token}
            };

        request.get(options, function(error, response, body){

            if(error){
                console.log(error);
            }

            var parsed = JSON.parse(body);
            console.log(parsed);

        });


    }


  };
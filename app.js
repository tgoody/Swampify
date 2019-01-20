/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'b17ecc12d66441eb8749fcee579ea8a1'; // Your client id
var client_secret = 'f2b6f115f4d54823a6782a13dd2a07ab'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var songData = [0.7, 0.5, 0.2, 0.0, 0.7];


var clientBody;
var clientURI;

const Playlist = require('./modules/playlist');
const Track = require('./modules/track');

const path = require('path');

var join_code;


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    //console.log(body);
                    clientBody = body;

                    var clientID = clientBody.id;
                    var options = {
                        url: 'https://api.spotify.com/v1/users/' + clientID + '/playlists?limit=50',
                        headers: { 'Authorization': 'Bearer ' + access_token }
                    };


                    //createPlaylist(clientID, access_token);

                    var parsedItems;
                    var playlists = [];

                    request.get(options, function(error, response, body){
                        //console.log(body);
                        if(error){
                            console.log(error);
                        }

                        var parsed = JSON.parse(body);
                        //console.log(parsed.next);
                        parsedItems = parsed.items;

                        //console.log(playlists);

                        parsedItems.forEach(function(item){
                            //console.log("name: " + item.name + "\n");
                            var playlist = new Playlist(item.name, item.tracks);
                            //console.log(playlist);
                            playlists.push(playlist);

                        });

                        playlists.forEach(function (playlist) {
                            playlist.addTracks(access_token, function () {

                                storeTrackData(playlist, access_token, fillPlaylist());

                                //console.log(playlist.trackArray);
                                //console.log("\nNEWPLAYLIST\n");
                                //console.log(playlist.trackArray.length);
                            });
                        });





                    });
                });

            
                // we can also pass the token to the browser to make requests from there
                // res.redirect('/#' +
                //     querystring.stringify({
                //         access_token: access_token,
                //         refresh_token: refresh_token
                //     }));

                join_code = generateRandomString(6);
                console.log(join_code);
                res.redirect('/join_code/' + join_code);

            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/join_code/:id' , function(req,res){
    console.log("BEFORE SEND FILE: " + join_code);
    res.sendFile(path.join(__dirname+'/public/loaded.html'));

});


app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(8888);



function storeTrackData(playlist, access_token){


        var firstURLPart = "https://api.spotify.com/v1/audio-features/?ids=";

        //console.log(playlist.trackArray);
        //console.log(playlist);
        for(i = 0; i < playlist.trackArray.length-1; i++){
            firstURLPart = firstURLPart.concat(playlist.trackArray[i].id, ',');
        }
        firstURLPart = firstURLPart.concat(playlist.trackArray[playlist.trackArray.length-1].id);

        var options = {
            url: firstURLPart,
            headers: {'Authorization': 'Bearer ' + access_token}
        }

        request.get(options, function(error, response, body){
            if(error){
                console.log(error);
            }

            var parsed = JSON.parse(body);
            //console.log(parsed);

            var counter = 0;

                if (parsed.audio_features) {
                    //console.log("Audio feature length: " + parsed.audio_features.length);
                    for (i = 0; i < parsed.audio_features.length; i++) {

                        playlist.trackArray[i].danceability = parsed.audio_features[i].danceability;
                        playlist.trackArray[i].energy = parsed.audio_features[i].energy;
                        playlist.trackArray[i].acousticness = parsed.audio_features[i].acousticness;
                        playlist.trackArray[i].instrumentalness = parsed.audio_features[i].instrumentalness;
                        playlist.trackArray[i].valence = parsed.audio_features[i].valence;
                        counter++;
                        //console.log(playlist.trackArray[i]);
                    }
                    if (counter === parsed.audio_features.length && counter !== 0) {
                        playlist.complete = true;
                        fillPlaylist(playlist, access_token);

                    }
                }



            //console.log(parsed);


        })




}


function createPlaylist(clientID, access_token){

    var options = {

            url: "https://api.spotify.com/v1/users/" + clientID + "/playlists",
            body: JSON.stringify({name: "Swampify"}),
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request.post(options, function(error, response, body){

            //console.log(body);


        });


}


function fillPlaylist(playlist, access_token) {


}




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
//var Handlebars = require('handlebars');

const path = require('path');
const bodyParser = require('body-parser');

var client_id = 'b17ecc12d66441eb8749fcee579ea8a1'; // Your client id
var client_secret = 'f2b6f115f4d54823a6782a13dd2a07ab'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var songData = [];

var newPlaylistID;

var clientBody;
var clientURI;

// MODULES/CLASSES HERE
const Playlist = require('./modules/playlist');
const Track = require('./modules/track');

var join_code;
var playlist_name;


var app = express();
app.set('view engine', 'ejs');
app.set('views', "./public/views")

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));

//app.engine('html', require('ejs').renderFile);


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

app.post('/create', function(req, res) {
    console.log(req.body);
    playlist_name = req.body.name;
    songData = [req.body.dance_val / 100, req.body.energy_val / 100, req.body.acoustic_val / 100, req.body.instrument_val / 100, req.body.valence_val / 100 ];

    console.log("SONG DATA: " + songData);
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
                    
                    clientBody = body;

                    var clientID = clientBody.id;
                    var options = {
                        url: 'https://api.spotify.com/v1/users/' + clientID + '/playlists?limit=50',
                        headers: { 'Authorization': 'Bearer ' + access_token }
                    };


                    createPlaylist(clientID, access_token);

                    var parsedItems;
                    var playlists = [];

                    request.get(options, function(error, response, body){
                        if(error){
                            console.log(error);
                        }

                        var parsed = JSON.parse(body);
                        //console.log(parsed.next);
                        parsedItems = parsed.items;

                        //console.log(playlists);

                        parsedItems.forEach(function(item){
                            //console.log("name: " + item.name + "\n");
                            var playlist = new Playlist(item.name, item.tracks, item.id);
                            //console.log(playlist);
                            playlists.push(playlist);

                        });

                        playlists.forEach(function(playlist){
                            playlist.addTracks(access_token, function(){

                                storeTrackData(playlist, access_token);

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

                res.redirect('/');

                // THIS IS IMPORTANT FOR LATER, FUCK
                // join_code = generateRandomString(6);
                // res.redirect('/join_code/' + join_code);

            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

//Directs user to unique url based on code generated,loads new html page
app.get('/join_code/:id' , function(req,res){
    //res.sendFile(path.join(__dirname+'/public/loaded.html'));
    res.render('test', {message: join_code});     
    // res.render(__dirname+'/public/loaded', {title: 'YO', message: join_code});
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
        for(i = 0; i < playlist.trackArray.length-1; i++){
            firstURLPart = firstURLPart.concat(playlist.trackArray[i].id, ',');
        }
        //firstURLPart = firstURLPart.concat(playlist.trackArray[playlist.trackArray.length-1].id);

        var options = {
            url: firstURLPart,
            headers: {'Authorization': 'Bearer ' + access_token}
        };

        request.get(options, function(error, response, body){
            if(error){
                console.log(error);
            }

            var parsed = JSON.parse(body);
            //console.log(parsed);

            var counter = 0;


            if(parsed.audio_features !== null) {
                //console.log("Audio feature length: " + parsed.audio_features.length);
                for (i = 0; i < parsed.audio_features.length; i++) {

                    if(parsed.audio_features[i] == null){
                        continue;
                    }

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
                    //console.log(playlist.name);
                    if (playlist.name !== null) {
                        //console.log(playlist.name);
                        fillPlaylist(playlist, access_token)
                    }


                }
            }

            if(counter == parsed.audio_features.length-1){
                readyToMakePlaylist = true;
            }
            //console.log(parsed);
        })




}


function createPlaylist(clientID, access_token){

    var options = {
            url: "https://api.spotify.com/v1/users/" + clientID + "/playlists",
            body: JSON.stringify({name: playlist_name}),
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        };

        request.post(options, function(error, response, body){

            //console.log(body);
            var fuckParse = JSON.parse(body);
            newPlaylistID = fuckParse.id;



        });


}


function fillPlaylist(playlist, access_token) {


    var firstURLPart = "https://api.spotify.com/v1/playlists/" + newPlaylistID + "/tracks";

    var matchingTrackURIs = [];
    var counter = 0;

    playlist.trackArray.forEach(function (track) {

        if (
            (track.danceability <= (songData[0] + 0.1) && track.danceability >= (songData[0] - 0.1))
            && (track.energy <= (songData[1] + 0.1) && track.energy >= (songData[1] - 0.1))
            && (track.acousticness <= (songData[2] + 0.1) && track.acousticness >= (songData[2] - 0.1))
            && (track.instrumentalness <= (songData[3] + 0.1) && track.instrumentalness >= (songData[3] - 0.1))
            && (track.valence <= (songData[4] + 0.1) && track.valence >= (songData[4] - 0.1))
        ) {

            //console.log(track);
            matchingTrackURIs.push(track.uri);

        }

        counter++;
    });


    if(counter === playlist.trackArray.length) {

        var options = {

            url: firstURLPart,
            body: JSON.stringify(matchingTrackURIs),
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            }
        }

        request.post(options, function (error, response, body) {

            //console.log(body);


        });
    }










}




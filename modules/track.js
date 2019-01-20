module.exports = class Track{
    constructor(name, id, uri){
        this.name = name;
        this.id = id;
        this.uri = uri;
        this.danceability = 0;
        this.energy = 0;
        this.acousticness = 0;
        this.instrumentalness = 0;
        this.valence = 0;
    }

}
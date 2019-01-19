module.exports = class Track{
    constructor(name, id){
        this.name = name;
        this.id = id;
        this.danceability = 0;
        this.energy = 0;
        this.acousticness = 0;
        this.instrumentalness = 0;
        this.valence = 0;
    }

}
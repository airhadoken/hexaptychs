var fs = require("fs");
var Q = require("q");
var Twit = require("twit");
var request = require("request");
var child_process = require("child_process");

var config = require("./config.json");
var Flickr = require('flickrapi');

// Randomly select, remove, and return an element from an array,
//  optionally limiting the candidates to those satisfying a query object 
//  containing one or more keys which must match exactly.
function pluck(arr, query) {
  var candidates, cand;
  if(query) {
    candidates = arr.filter(function(item) {
      return Object.keys(query).reduce(function(currval, key) {
        var val = item[key];
        return currval && (val === query[key]);
      }, true);
    });

    cand = candidates[Math.floor(Math.random() * candidates.length)];
    arr.splice(arr.indexOf(cand), 1);
    return cand;
  } else {
    return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];  
  }
}
Array.prototype.pluck = function(query) { return pluck(this, query); };


function buildFlickrUrl(photo_data) {
  return [
    "https://farm",
    photo_data.farm,
    ".staticflickr.com/",
    photo_data.server,
    "/",
    photo_data.id,
    "_",
    photo_data.secret,
    "_c.jpg"
  ].join("");
}

//  Non-setuppy code starts here.
function doLoop() {
  var T = new Twit({
    consumer_key:     config.consumer_key, 
    consumer_secret:  config.consumer_secret,
    access_token:     config.access_token,
    access_token_secret: config.access_token_secret
  });

  var QT = Q(T);

  var searchTerm = "Marilyn";

  Q(Flickr).ninvoke('tokenOnly', { 
    api_key: config.flickr_consumer_key, 
    secret: config.flickr_consumer_secret
  }).then(function(f) { 
    return Q(f.photos).ninvoke('search', { 
      tags: 'celebrity,portrait,object,still life,headshot', 
      safe: 1,
      license: config.flickr_licenses 
    }); 
  }).then(function(data) { 
    var deferred = Q.defer();
    var photos = data.photos.photo;

    function nextPhoto() {
      var photo = photos.pluck();
      console.log("Attempting to download", buildFlickrUrl(photo));
      var req = request({ 
        followRedirect: false,
        url: buildFlickrUrl(photo)
      }).on("response", function(response) {
        console.log("responded with code", response.statusCode);
        if (response.statusCode !== 200) {
          req.abort();
          if(photos.length < 1) {
            console.log("Error: all photos out");
            deferred.reject("No photos available");
          } else {
            console.log("Calling nextPhoto next tick");
            process.nextTick(nextPhoto);
          }
        }
      })
      .on("error", function(error) {
        console.error(error);
        if(photos.length < 1) {
          deferred.reject("No photos available");
        } else {
          process.nextTick(nextPhoto);
        }
      })
      .pipe(fs.createWriteStream("source.jpg"))
      .on("finish", function() {
        console.log("pipe finished");
        deferred.resolve(Q.all(["source.jpg", photo]));
      });
    }
    nextPhoto();
    return deferred.promise;
  }).spread(function(filename, photo_data) {
    child_process.execFileSync("./warholize.sh", [filename]);
    return Q.all([filename, fs.readFileSync("converted.jpg"), photo_data]);
  }).spread(function(filename, file, photo_data) {
    return Q.all([filename, QT.ninvoke("post", "media/upload", { media: file.toString('base64') }), photo_data]);
  }).spread(function(filename, pack, photo_data) {
    var data = pack[0];
    return QT.ninvoke("post", 'statuses/update', { 
      status: ["Untitled",
              photo_data.title ? " [" + photo_data.title.
                                        replace(/^(.{10}[^ ]*) .*$/, "$1")
                                        .replace(/[ .,/?'";:\]\[{}()*&^%$#@!-=+|\\`~]+$/, "") + "]" 
                               : "",
              ", ",
              new Date().getFullYear(),
              "\n(Source: https://www.flickr.com/photos/",
              photo_data.owner,
              "/",
              photo_data.id,
              ")"].join(""),
      media_ids: [data.media_id_string] 
    });
  }).then(function(reply) {
    console.log("reply: ", reply);    
    console.log("save success.  finish process");
  }, function(e) {
    console.error(e.stack || e);
  }).finally(function() {
    if(~process.argv.indexOf("-once")) {
      process.exit();
    }
  });

  if(!~process.argv.indexOf("-once")) {
    setTimeout(doLoop, config.interval);
  }
}

doLoop();


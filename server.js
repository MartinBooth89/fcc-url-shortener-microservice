// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var mongodb = require('mongodb').MongoClient;

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

function insertShortUrl(response, url, db, sites, max) {            
    sites.insert({url: url, short: max});
  
    db.close();

    response.send({original_url: url, short_url: max});
}

function getNextAvailableShortUrl(response, url, db, sites, callback) {
    
  sites.aggregate(
     [
       {
         $group:
           {
             _id: null,
             maxShort: { $max: "$short" }
           }
       }
     ], (error, max) => {
       callback(response, url, db, sites, max[0].maxShort + 1);
     }
  )
}

function redirectToShortUrl(response, shortUrl) {
  var short = Number(shortUrl);
    mongodb.connect('mongodb://martin:12345@ds013320.mlab.com:13320/freecodecamp', (error, db) => {
        var sites = db.collection("shortened-sites");
        
        sites.findOne({short: short}, (error, doc) => {
            console.log(doc);
            if (doc != null) {
              response.redirect(doc.url);
              
              db.close();
            } else {
              response.setHeader("ContentType", "application/json");
              response.status(404).send({error:'Unknown short url'});
            }
        });
    });
}

function createShortUrl(response, url) {
  mongodb.connect('mongodb://martin:12345@ds013320.mlab.com:13320/freecodecamp', (error, db) => {
    var sites = db.collection("shortened-sites");

    sites.findOne({url: url}, (error, doc) => {
      if (doc != null) {
        db.close();
        response.send( {original_url: url, short_url: doc["short"]});
      } else {

        getNextAvailableShortUrl(response, url, db, sites, insertShortUrl);
      }
    });
  });
} 

app.get("/shorten/*", function(request, response) {
  var url = request.params["0"];  

  //From https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
  var urlPattern = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/;

  if (!urlPattern.test(url)) {
    response.setHeader("ContentType", "application/json");
    response.status(400).send({error:'Invalid Url:' + url});
  } else {  
    createShortUrl(response, url); 
  }
});

app.get("/visit/*", function(request, response) {
  if (!isNaN(Number(request.params["0"]))) {
    redirectToShortUrl(response, request.params["0"]);
  } else {
    response.setHeader("ContentType", "application/json");
    response.status(400).send({error:'Short url must be an integer.'});
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

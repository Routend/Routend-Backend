var models = require('./models.js');
var geo = require('geo-helpers');
var crypto = require('crypto');
var moment = require('moment');

var populateDatabase = function(coords) {
    for (var i  = 0; i < coords.length; i++) {
      var params = [1, coords[i][2], coords[i][0], coords[i][1]];
      models.coordinates.post(params, function(err, results) {
        if (err) {
          console.log('error: ', err);
        }
      });
    }
  }

var mockData = function(centralLat, centralLong, startingTime) {
  var numPoints = Math.ceil(Math.random() * 6);
  var coords = [];
  var startLat, startLong, endLat, endLong;
  for (var i = 0; i < numPoints; i++) {
    startLat = centralLat + Math.random() / 10;
    startLong = centralLong + Math.random() / 10;
    endLat = centralLat + Math.random() / 10;
    endLong = centralLong + Math.random() / 10;
    coords = coords.concat(geo.interpolatePoints(startLat, startLong, endLat, endLong, 100));

    //Stub minimum of 2 hours of coordinates at each location
    for (var j = 0; j < 24 + Math.random() * 96; j++) {
      coords.push([endLat + (Math.random() / 1000), endLong + (Math.random() / 1000)]);
    }
  }

  //Add Epoch time values for each coordinate
  for (var i = 0; i < coords.length; i++) {
    coords[i].push(startingTime + 300 * i);
  }

  populateDatabase(coords);

  return coords;
}

var genRandomString = function(length) {
  return crypto.randomBytes(Math.ceil(length/2))
          .toString('hex')
          .slice(0, length)
};

var sha512 = function(password, salt) {
  var hash = crypto.createHmac('sha512', salt);
  hash.update(password);
  var value = hash.digest('hex');
  return {
    salt: salt,
    passwordHash: value
  };
};

var saltHashPassword = function(userpassword) {
  var salt = genRandomString(16);
  var passwordData = sha512(userpassword, salt);
  return passwordData;
}



module.exports = {

  users: {
    get: function(req, res) {
      var params = [req.query.email];
      models.users.get(params, function(err, results) {
        if (err) {
          //console.log for now, handle appropriatly eventually
          console.log('error: ', err);
        }
        var validate = sha512(req.query.password, results[0].salt);
        if(validate.passwordHash === results[0].hash){
          res.json(results);
        } else {
          res.sendStatus(401);
        }
      });
    },
    post: function(req, res) {
      var passwordData = saltHashPassword(req.body.password);

      var params = [req.body.username, passwordData.passwordHash, passwordData.salt, req.body.address, req.body.email, req.body.createdAt];
      models.users.post(params, function(err, results) {
        if (err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    }
  },
  coordinates: {
    get: function(req, res) {
      var params = [req.query.id_users , req.query.start, req.query.end];
      models.coordinates.get(params, function(err, results) {
        if (err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var time = moment(req.body.location.coords.timestamp).unix();
      if(req.body.geolocation !== undefined) {
        if(req.body.geolocation.action === 'ENTER') {
          models.categoryStats.post([req.body.id_users, req.body.geolocation.identifier, req.body.identifier, time, 0], function(err, results) {
            res.sendStatus(201);
          });
        } else if (req.body.geolocation.action === 'EXIT') {
          models.categoryStats.put([time, req.body.id_users, req.body.geolocation.identifier], function(err, results) {
            res.sendStatus(200);
          });
        }
      } else {
        var params = [req.query.id_users, time, req.body.location.coords.latitude, req.body.location.coords.longitude];
        models.coordinates.post(params, function(err, results) {
          if (err) {
            console.log('error: ', err);
          }
          res.sendStatus(201);
        });
      }
    }
  },
  locations: {
    get: function (req, res) {
      var params = [req.query.id_users];
      models.locations.get(params, function(err, results) {
        if (err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function (req, res) {
      var params = [req.body.id_users, req.body.name, req.body.category, req.body.placeId, req.body.image, req.body.address, req.body.rating, req.body.lat, req.body.lng];
      models.locations.post(params, function(err, results) {
        if (err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      })
    }
  },

  categoryStats: {
    get: function(req, res) {
      var params = [req.query.id_users];
      models.categoryStats.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var params = [req.body.id_users, req.body.name, req.body.name, req.body.enter_time, req.body.exit_time];
      models.categoryStats.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    },
    put: function(req, res) {
      var params = [req.body.exit_time, req.body.id_users, req.body.name];
      models.categoryStats.put(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(200);
      });
    }
  },

  profiles: {
    get: function(req, res) {
      var params = [req.query.id_users];
      models.profiles.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function (req, res) {
      var params = [req.body.id_users, req.body.first_name, req.body.last_name, req.body.gender, req.body.city, req.body.state, req.body.image, req.body.status, req.body.push];
      models.profiles.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    },
    put: function(req, res) {
      if(req.body.push) {
        var params = [req.body.push, req.body.id_users];
        models.profiles.putPush(params, function(err, results) {
          if(err) {
            console.log('error: ', err);
          }
          res.sendStatus(200);
        });
      } else if (req.body.image) {
        var params = [req.body.image, req.body.id_users];
        models.profiles.putImage(params, function(err, results) {
          if(err) {
            console.log('error: ', err);
          }
          res.sendStatus(200);
        });
      } else if (req.body.status) {
        var params = [req.body.status, req.body.id_users];
        models.profiles.putImage(params, function(err, results) {
          if(err) {
            console.log('error: ', err);
          }
          res.sendStatus(200);
        });
      }
    }
  },
  status: {
    get: function(req, res) {
      var params = [req.query.id_users];
      models.status.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var params = [req.body.id_users, req.body.status];
      models.status.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    }
  },
  images: {
    get: function(req, res) {
      var params = [req.query.id_users];
      models.images.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var params = [req.body.id_users, req.body.image];
      models.images.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    }
  },

  interests: {
    get: function(req, res) {
      var params = [req.query.interest];
      models.interests.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var params = [req.body.id_users, req.body.interest];
      models.interests.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      });
    }
  },

  matches: {
    get: function(req, res) {
      var params = [req.query.id_users];
      models.matches.get(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.json(results);
      });
    },
    post: function(req, res) {
      var params = [req.body.id_users, req.body.match_id];
      models.matches.post(params, function(err, results) {
        if(err) {
          console.log('error: ', err);
        }
        res.sendStatus(201);
      })
    }
  },

  populateDatabase: populateDatabase,
  mockData: mockData

  // locationTime: function(req, res) {
  //   var params = [req.body.id_users];
  //     models.locations.get(params, function(err, results) {
  //       if (err) {
  //         console.log('error: ', err);
  //       }
        
  //       for (var i = 0; i < results.length; i++) {
  //         if (geo.findGeodesic()) {
            
  //         }
  //       }

  //     });

  // }

};
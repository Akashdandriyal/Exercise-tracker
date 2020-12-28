const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))

require('dotenv').config({path: __dirname + '/.env'});
mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }, (err) => {
      if(err) {
      console.log(err);
    }
      else {
    console.log("DB connected");
    }
  } 
);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const exerciseSchema = new mongoose.Schema({
  username: String,
  description: [String],
  duration: [Number],
  date: [Date]
});
const userData = mongoose.model("userData", exerciseSchema); 

app.post('/api/exercise/new-user', (req, res) => {
  let uname = req.body.username;
  //console.log(uname);
  if(uname === "") {
    res.send("Username is required");
  } else {
    userData.findOne({username: uname}, (err, doc) => {
      if(doc) {
        res.send("Username already taken");
      } else {
        let newUser = new userData({
          username: uname
        });

        newUser.save((err, doc) => {
          if(!err) {
            //console.log(doc);
            res.json({
              username: doc.username,
              _id: doc._id
            });
          }
        });
      }
    });
  }
});

app.post('/api/exercise/add', async (req, res) => {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  //console.log(req.body);
  if(date === '' || date === undefined) {
    date = new Date();
  } else {
    date = new Date(req.body.date);
  }
  //console.log(`*************${date}***********`);
  
  if(userId === "") {
    res.send("UserId is required");
  } else if(description === "") {
    res.send("description is required");
  } else if(duration === "") {
    res.send("duration is required");
  } else {
    try {
      await userData.findOne({_id: userId}, async (err, doc) => {
        if(doc) {
          //console.log(doc);
          doc.description.push(description);
          doc.duration.push(duration);
          doc.date.push(date);
          await doc.save((err, doc) => {
            if(!err) {
              //console.log(doc);
              res.json({
                username: doc.username,
                description,
                duration: Number(duration),
                _id: doc._id,
                date: (date + "").slice(0, 15)
              });
            }
          });
        } else {
          res.send("Not found");
        } 
      });
    } catch(e) {
      console.log(e);
    }
  }
  
});

app.get('/api/exercise/users', async (req, res) => {

  await userData.find({}, 'username _id', (err, doc) => {
    if(doc) {
      res.json(doc);
    }
  })
});

app.get('/api/exercise/log', async (req, res) => {

  const queryObject = req.query;
  //console.log(queryObject);
  try {
    if(queryObject.hasOwnProperty('from')) {
      await userData.findOne({_id: queryObject.userId, date: {$gte: queryObject.from, $lt: queryObject.to}}, (err, doc) => {
        if(doc) {
          let userDetails = {};
          userDetails.username = doc.username;
          userDetails._id = doc._id;
          userDetails.log = [];
          let limit = (req.query.limit < doc.description.length) ? req.query.limit : doc.description.length;
          for (let i = 0; i < limit; i++) {
            userDetails.log.push({
              description: doc.description[i],
              duration: doc.duration[i],
              date: doc.date[i]
            });
          }
          userDetails.count = userDetails.log.length;
          res.json(userDetails);
        } else {
          res.send("Not found");
        }
      });
    } else {
        await userData.findOne({_id: queryObject.userId}, (err, doc) => {
        if(doc) {
          let userDetails = {};
          userDetails.username = doc.username;
          userDetails._id = doc._id;
          userDetails.log = [];
          let limit = (req.query.limit < doc.description.length) ? req.query.limit : doc.description.length;
          for (let i = 0; i < limit; i++) {
            userDetails.log.push({
              description: doc.description[i],
              duration: doc.duration[i],
              date: doc.date[i]
            });
          }
          userDetails.count = userDetails.log.length;
          res.json(userDetails);
        } else {
          res.send("Not found");
        }
      });
    }
  } catch(e) {
    res.end(e);
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

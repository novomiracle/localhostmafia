const express = require('express')
const repl = require("node:repl");
const fs = require('fs');
const data = require('./data.js')
const WebSocket = require('ws');
let mafia = []
let time = 0;
let victims = []
let votes = 0;
let times = {
  TALKING: 300,
  VOTING: 60,
  NIGHT: 300
}
let numberOfMafia = 0;
let numberOfPlayers = 0;
let maxPlayers;
const states = {
  TALKING: 0,
  VOTING: 1,
  NIGHT: 2
}
let started = false;
let state = states.TALKING;
//const userRouter = require('./routers/users.js')
const http = require("http");
const messagesRouter = require('./routers/messages.js');
// const {
//   name
// } = require('ejs');
const app = express()
const server = http.createServer(app);
const wss = new WebSocket.Server({
  server
});
const router = express.Router();
readPreferences()
app.use(express.json())
app.use(express.static('public'))
app.use(express.urlencoded({
  extended: true
}))
app.set('view engine', 'ejs')
app.use('/messages', messagesRouter)
app.get('/', (req, res) => {
  console.log(data.users)
  res.render("index", {
    text: req.query.name,
    passed: req.query.passed
  })
})
app.post('/send', (req, res) => {
  let key = Math.random().toString(36).substring(2, 15)
  //messages.push({user:user,message:req.body.text})
  if (data.users[req.body.text] == undefined) {
    if (!started) {
      data.users[req.body.text] = {
        key: key,
        role: 'unknown',
        voted: false,
        votes: 0
      }
      numberOfPlayers++;
    }
    res.redirect(`/messages?name=${encodeURIComponent(req.body.text)}&key=${encodeURIComponent(key)}`)
    if(numberOfPlayers == maxPlayers){
      start()
    }
  } else {
    res.redirect(`/?name=${encodeURIComponent(req.body.text)}&passed=false`)
  }
})
//app.use('/users', userRouter)
app.all(/.*/, (req, res) => {
  res.send('404 Not Found')
})

function giveRandomRoles() {
  let usersCopy = {}
  let userNames = Object.keys(data.users)
  userNames.forEach((name) => {
    usersCopy[name] = data.users[name]
  })
  //used to loop throught the userKeys(since we are using loops based on roles, but not the usersCopy array)
  let userInArrayId = 0;
  shuffleArray(usersCopy)
  let er = false
  try {
    Object.keys(data.roles).forEach(role => {
      //giving out the roles
      for (let i = 0; i < data.roles[role]; i++) {
        console.log(JSON.stringify(userNames), userInArrayId)
        usersCopy[userNames[userInArrayId]].role = role;
        userInArrayId++;
      }
    })
  } catch (error) {
    er = true
    console.error(error)
    notEnoughPlayers()
    return "roles"
  } finally {
    if (!er) {
      data.users = usersCopy
      wss.clients.forEach((client) => {
        client.send(JSON.stringify({
          type: "start"
        }))
        client.send(JSON.stringify({
          type: "message",
          name:"server",
          message:"start"
        }))
      })
    }
  }
}

function notEnoughPlayers() {
  wss.clients.forEach((client) => {
    console.log("mes")
    let message = {
      name: "server",
      message: "Not enough players",
      type: "message"
    };
    //data.messages.push(message)
    client.send(JSON.stringify(message))
  })
}

function countVotes() {
  let players = Object.keys(data.users).toSorted((a, b) => {
    return data.users[b].votes - data.users[a].votes
  })
  let mostVoted = players.filter((el) => {
    return data.users[el].votes == data.users[players[0]].votes
  })
  if (mostVoted.length == 1) {
    kill(mostVoted[0])
    if (state == states.VOTING) {
      nextState()
    }
  }
  resetVotes()
}

function resetVotes() {
  Object.keys(data.users).forEach((name) => {
    //state = states.TALKING
    data.users[name].votes = 0
    data.users[name].voted = 0
  })
  votes = 0
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
wss.on("connection", (ws) => {
  console.log('New client connected');
  ws.on("message", (msg, isBinary) => {
    let message = JSON.parse(msg.toString());
    console.log("users", data.users)
    switch (message.type) {
      case "message":
        if (checkAuth(message, true) && state == states.TALKING && message.role != "dead") {
          data.messages.push(message)
          wss.clients.forEach((client) => {
            client.send(msg.toString())
          })
        }
        break
      case "join":
        if (!started) {
          wss.clients.forEach((client) => {
            if ((ws != client)) {
              client.send(msg.toString())
            }
          })
        }
        break
      case "action":
        if (checkAuth(message, true)) {
          if (state == states.NIGHT) {
            switch (message.role) {
              case "mafia":
                let voter = data.users[message.name];
                if (!voter.voted) {
                  console.log(message.target)
                  data.users[message.target].votes++
                  votes++;
                  voter.voted = true
                  mafia.forEach((client) => {
                    client.send(JSON.stringify({
                      type: "message",
                      name: message.name,
                      message: `voted for ${message.target}`
                    }))
                  })
                  if (votes == numberOfMafia) {
                    countVotes()
                  }
                }
            }
          } else if (state == states.VOTING) {
            console.log(votes, numberOfPlayers)
            let voter = data.users[message.name];
            console.log(voter)
            if (!voter.voted) {
              console.log(message.target)
              data.users[message.target].votes++
              votes++;
              voter.voted = true
              wss.clients.forEach((client) => {
                client.send(JSON.stringify({
                  type: "message",
                  name: message.name,
                  message: `voted for ${message.target}`
                }))
              })
              if (votes == numberOfPlayers) {
                countVotes()
              }
            }
          }
        }
        break
      case "point":
        console.log("point 1", state)
        if (state == states.NIGHT && checkAuth(message, true)) {
          console.log("point 2")
          if (message.role == "mafia") {
            console.log("point 3")
            mafia.forEach((client) => {
              message.type = "message"
              message.message = `points to ${message.target}`
              client.send(JSON.stringify(message))
            })
          }
        }
        break
      case "role":
        if (checkAuth(message)) {

          ws.send(JSON.stringify({
            type: "role",
            role: data.users[message.name].role
          }))
          if (data.users[message.name].role == "mafia") {
            if (!mafia.includes(ws)) {
              mafia.push(ws)
              numberOfMafia++
            }
          }
        }
        break
      default:
        console.error("Invalid message type");
    }
  })
})

server.listen(3001, "0.0.0.0")

function start() {
  giveRandomRoles()
  started = true
}
const replServer = repl.start('> ');

function nextState() {
  if (state < 2) {
    state++;
  } else {
    state = 0
  };
  console.log("state ", state)
  time = 0
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      type: "state",
      state: state
    }))
  })
  //changeState()
}

function checkAuth(message, role = false) {
  console.log("role", role ? data.users[message.name].role == message.role : true)
  return data.users[message.name] != undefined && data.users[message.name].key == message.key && role ? data.users[message.name].role == message.role : true
}

function giveRole(name, role) {
  data.users[name].role = role
  //if(role=="mafia") mafia.push(data.users[name])
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      type: "start"
    }))
  })
}

function changeState(n) {
  state = n
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      type: "state",
      state: state
    }))
  })
  return n
}

function kill(target, voting = false) {
  numberOfPlayers--;
  if (data.users[target].role == "mafia") {
    numberOfMafia--;
  }
  data.users[target].role = "dead"
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      type: "start"
    }))
    if (voting) {
      client.send(JSON.stringify({
        type: "message",
        name:"server",
        message:`${target} was voted out`
      }))
    }
  })
  if (numberOfPlayers / 2 <= numberOfMafia) {
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({
        type: "message",
        name: "server",
        message: "Mafia won"
      }))
      started = false;
    })
  } else if (1 > numberOfMafia) {
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({
        type: "message",
        name: "server",
        message: "Citizens won"
      }))
      started = false;
    })
  }
}
setInterval(timer, 1000)
function test(){
  console.log("interval")
}
function timer() {
  if (started) {
    time++;
  }
  switch (state) {
    case states.TALKING:
      if (time > times.TALKING) {
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: "message",
            message: "time to vote",
            name: "server"
          }))
        })
        nextState();
      }
      break
    case states.VOTING:
      if (time > times.VOTING) {
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: "message",
            message: "as the night begins, citizens fall asleep, and mafia chooses its new victim",
            name: "server"
          }))
        })
        nextState();
      }
      break
    case states.NIGHT:
      if (time > times.NIGHT) {
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: "message",
            message: "the sun rises, and the citizens wake up",
            name: "server"
          }))
        })
        nextState();
      }
      break
    default:
      console.log(state)
      break
  }
}

function getState() {
  return state
}

function readPreferences() {
  let preferences = fs.readFile("backend/preferences.json", 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
    console.log('File contents:', data);
  });
  let jsonFile = JSON.parse(preferences)
  times = jsonFile.times
  data.roles = jsonFile.roles
  maxPlayers = 0
  Object.keys(data.roles).forEach(role => {
    maxPlayers += role
  })
  return preferences
}
// expose functions to REPL
replServer.context.preferences = readPreferences;

replServer.context.start = start;

replServer.context.changeState = changeState;
replServer.context.data = data;
replServer.context.server = server;
replServer.context.state = getState;
replServer.context.giveRole = giveRole
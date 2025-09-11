let username;
let key;
let messageElement;
let messageBlock;
let role
let chatForm;
let usersBlock;
const states = {
    TALKING: 0,
    VOTING: 1,
    NIGHT: 2
}
let state = 0;

function start() {
    getMessages()
    changeState()
    username = document.getElementById("name").innerHTML.slice(5)
    key = document.getElementById("key").innerHTML.slice(4)
    messageElement = document.getElementById("text");
    messageBlock = document.getElementById("messages")
    chatForm = document.getElementById("chat")
    usersBlock = document.getElementById("users")
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.addEventListener("open", (event) => {
        ws.send(JSON.stringify({
            type: "join",
            name: username
        }))
    })
    ws.addEventListener("message", (msg) => {
        let message = JSON.parse(msg.data);
        switch (message.type) {
            case "message":
                add_message(message)
                messageBlock.scrollTop = messages.scrollHeight;
                break
            case "join":
                add_user(message.name)
                break
            case "start":
                ws.send(JSON.stringify({
                    type: "role",
                    name: username,
                    key: key
                }))
                break
            case "role":
                role = message.role
                console.log(role)
                break
            case "state":
                state = message.state
                changeState()
                break
            default:
                console.error("Invalid message type");
        }
    })
    console.log("hello world")
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault()
        ws.send(JSON.stringify({
            type: "message",
            message: messageElement.value,
            name: username,
            key: key
        }))
        messageElement.value = ''
    })
}

function getMessages() {
    console.log("ask")
    fetch("/messages/getMessages").then(res => res.json()).then(data => {
        messageBlock.innerHTML = ''
        usersBlock.innerHTML = ''
        data.messages.forEach(message => {
            add_message(message)
        });
        data.users.forEach(user => {
            add_user(user)
        });
    }).catch(err => console.error("Error getting messages:", err))
}

function add_message(message) {
    const li = document.createElement("li");
    li.textContent = message.name + ": " + message.message;
    messageBlock.appendChild(li)
}

function add_user(user) {
    const div = document.createElement("div");
    const li = document.createElement("li");
    const actionbutton = document.createElement("button");
    const pointbutton = document.createElement("button");
    actionbutton.className = "actionbutton"
    pointbutton.className = "pointbutton"
    div.className = "player"
    li.textContent = user
    li.className = "playername"
    actionbutton.user = user
    pointbutton.user = user
    div.appendChild(li)
    div.appendChild(actionbutton)
    actionbutton.innerHTML = "vote"
    pointbutton.innerHTML = "point" 
    div.appendChild(pointbutton)
    actionbutton.addEventListener("click", action)
    pointbutton.addEventListener("click", point)
    usersBlock.appendChild(div)
}

function action() {
    let target = this.user
    ws.send(JSON.stringify({
        type: "action",
        role: role,
        name: username,
        key: key,
        target: target
    }))
}

function point() {
    let target = this.user
    ws.send(JSON.stringify({
        type: "point",
        role: role,
        name: username,
        key: key,
        target: target
    }))
}

function activateButtons() {
    let actionbuttons = document.getElementsByClassName("actionbutton")
    let pointbuttons = document.getElementsByClassName("pointbutton")
    let action;
    switch (role) {
        case "mafia":
            action = "kill"
            break
        default:
            action = "vote"
    }
    console.log(actionbuttons)
    if (role != "citizen") {
        for (let i = 0; i < actionbuttons.length; i++) {
            actionbuttons[i].innerHTML = action
        }
    }
    if (role == "mafia") {
        for (let i = 0; i < pointbuttons.length; i++) {
            pointbuttons[i].classList.add("activebutton");
        }
    }
}

function deactivateButtons() {
    let actionbuttons = document.getElementsByClassName("actionbutton")
    let pointbuttons = document.getElementsByClassName("pointbutton")
    for (let i = 0; i < actionbuttons.length; i++) {
        actionbuttons[i].innerHTML = "vote"
    }
}

function changeState() {
    if (state == states.NIGHT) {
        activateButtons()
    } else {
        deactivateButtons()
    }
}
document.addEventListener("DOMContentLoaded", start)
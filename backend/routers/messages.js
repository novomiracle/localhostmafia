const express = require('express');
const router = express.Router();
const data = require('../data.js')
//const text = req.query.text; // "hello"
var name = "Anonymous";
var key = "0000000000";
router.get('/', (req, res) => {
    name = req.query.name;
    key = req.query.key;
    console.log("checking " + key)
    //res.send('Users Home Page')
    res.render('chat', {
        messages: data.messages,
        users: Object.keys(data.users),
        name:name,
        key:key
    })
})
// router.post('/', (req, res) => {
//     const inputText = req.body.text
//     if (data.users[name] != undefined && data.users[name].key == key) {
//         data.messages.push({
//             user: name,
//             message: req.body.text
//         })
//     }
//     })
router.get('/getMessages', (req, res) => {
    res.json({"messages":data.messages,"users":Object.keys(data.users)})
})
//router.post('/sendMessage', (req, res) => {
    // const inputText = req.body.text
    // console.log(req.body)
    // if (data.users[req.body.user] != undefined && data.users[req.body.user].key == req.body.key) {
    //     data.messages.push({
    //         user: req.body.user,
    //         message: req.body.message
    //     })
    // }
    //console.log("chilling")
    //res.redirect('/?text=' + encodeURIComponent(inputText)) 
    //res.redirect(`/messages?name=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`)
// })
module.exports = router;
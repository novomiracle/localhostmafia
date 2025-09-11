const express = require('express');
const router = express.Router();
const inputText = "hello";
router.get('/',(req,res)=>{
    //res.send('Users Home Page')
    res.render('index', { text: inputText})
})
router.get('/new',(req,res)=>{
    res.send('New User Page')
})
router.post('/',(req,res)=>{
    const inputText = req.body.text
    res.redirect(`/users/${inputText}`) 
})
router.get('/:id',(req,res)=>{
    res.send('id: ' + req.params.id)
})
module.exports = router;
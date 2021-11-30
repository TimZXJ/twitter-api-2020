const express = require('express')
const router = express.Router()
const tweetController = require('../controller/api/tweetController')
router.post('/tweets', tweetController.postTweet)
router.get('/tweets', tweetController.getTweets)
router.get('/tweets/:id', tweetController.getTweet)
router.put('/tweets/:id', tweetController.putTweet)
router.delete('/tweets/:id', tweetController.deleteTweet)
router.get('/hello', (req, res) => {
  res.send('hello world123')
})
module.exports = router

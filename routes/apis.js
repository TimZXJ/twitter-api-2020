const express = require('express')
const router = express.Router()
const tweetController = require('../controller/api/tweetController')
const userController = require('../controller/api/userController')
router.post('/tweets', tweetController.postTweet)
router.get('/tweets', tweetController.getTweets)
router.get('/tweets/:id', tweetController.getTweet)
router.put('/tweets/:id', tweetController.putTweet)
router.delete('/tweets/:id', tweetController.deleteTweet)
router.get('/users', userController.getUsers)
router.get('/users/:id', userController.getUser)
router.post('/users', userController.signUp)
router.put('/users/:id', userController.putUser)
router.get('/users/:id/tweets', userController.getUserTweets)
router.get('/users/:id/replied_tweets', userController.getUserReplies)
router.get('/users/:id/likes', userController.getUserLike)
router.get('/users/:id/followings', userController.getUserFollowings)
router.get('/users/:id/followers', userController.getUserFollowers)

module.exports = router

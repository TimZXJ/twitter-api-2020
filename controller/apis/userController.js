const db = require('../../models')
const Tweet = db.Tweet
const User = db.User
const Reply = db.Reply
const Like = db.Like
const Followship = db.Followship
const helper = require('../../_helpers')
const bcrypt = require('bcryptjs')

// JWT
const jwt = require('jsonwebtoken')
const passportJWT = require('passport-jwt')
const like = require('../../models/like')
const { sequelize } = require('../../models')
const { json } = require('body-parser')
const ExtractJwt = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy

const userController = {
  signIn: (req, res) => {
    // 檢查必要資料
    if (!req.body.email || !req.body.password) {
      return res.json({
        status: 'error',
        message: "required fields didn't exist"
      })
    }
    User.findOne({ where: { email: req.body.email } }).then(user => {
      if (!user)
        return res
          .status(401)
          .json({ status: 'error', message: 'user is not exist.' })
      if (!bcrypt.compareSync(req.body.password, user.password)) {
        return res
          .status(401)
          .json({ status: 'error', message: 'email or password incorrect.' })
      }
      // 簽發 token
      var payload = { id: user.id }
      var token = jwt.sign(payload, process.env.JWT_SECRET)
      return res.json({
        status: 200,
        message: 'pass',
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      })
    })
  },

  signUp: async (req, res, cb) => {
    if (req.body.checkPassword !== req.body.password) {
      return res.json({ status: 'error', message: '兩次密碼輸入不相同！' })
    } else {
      try {
        const user = await User.findOne({ where: { email: req.body.email } })
        if (user) {
          return res.json({ status: 'error', message: '信箱重複！' })
        }
      } catch (err) {
        console.log(err)
      }
    }
    try {
      await User.create({
        account: req.body.account,
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(
          req.body.password,
          bcrypt.genSaltSync(10),
          null
        )
      })
      return res.json({ status: 'success', message: '成功註冊帳號！' })
    } catch (err) {
      console.log(err)
    }
  },
  getUser: async (req, res, cb) => {
    try {
      const userProfile = await User.findByPk(req.params.id, {
        raw: true,
        nest: true,
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' }
        ]
      })
      const followship = await Followship.findOne({
        where: {
          followerId: helper.getUser(req).id,
          followingId: req.params.id
        }
      })
      const isFollowed = followship ? true : false
      return res.json({
        status: 'success',
        message: '',
        ...userProfile,
        isFollowed
      })
    } catch (err) {
      console.log(err)
    }
  },
  getUsers: async (req, res, cb) => {
    try {
      const users = await User.findAll({ raw: true, nest: true })
      return res.json({
        status: 'success',
        message: '',
        users
      })
    } catch (err) {
      console.log(err)
    }
  },
  getUserTweets: async (req, res) => {
    try {
      const tweets = await Tweet.findAll({
        attributes: {
          include: [
            [
              sequelize.fn(
                'COUNT',
                sequelize.fn('DISTINCT', sequelize.col('Replies.id'))
              ),
              'reply_count'
            ],
            [
              sequelize.fn(
                'COUNT',
                sequelize.fn('DISTINCT', sequelize.col('Likes.id'))
              ),
              'like_count'
            ]
          ]
        },
        include: [
          { model: Reply, attributes: [] },
          { model: Like, attributes: [] }
        ],
        where: { UserId: req.params.id },
        raw: true,
        nest: true,
        group: ['Tweet.id']
      })
      return res.json([...tweets, { status: 200, message: '' }])
    } catch (err) {
      console.log(err)
    }
  },
  getUserReplies: async (req, res) => {
    try {
      const replies = await Reply.findAll({
        where: { UserId: req.params.id },
        raw: true,
        nest: true,
        include: [{ model: Tweet, include: [User] }]
      })
      return res.status(200).json([...replies])
    } catch (err) {
      console.log(err)
    }
  },
  getUserLike: async (req, res) => {
    try {
      const data = await Tweet.findAll({
        attributes: [
          ['id', 'TweetId'],
          'description',
          [sequelize.col('User.id'), 'tweet_user_id'],
          [sequelize.col('User.name'), 'tweet_user_name'],
          [sequelize.col('User.account'), 'tweet_user_account'],
          [sequelize.col('User.avatar'), 'tweet_user_avatar'],

          [
            sequelize.fn(
              'COUNT',
              sequelize.fn('DISTINCT', sequelize.col('Replies.id'))
            ),
            'reply_count'
          ],
          [
            sequelize.fn(
              'COUNT',
              sequelize.fn('DISTINCT', sequelize.col('Likes.id'))
            ),
            'like_count'
          ],
          'createdAt'
        ],
        include: [
          { model: Reply, attributes: [] },
          { model: Like, attributes: [] },
          { model: User, attributes: [] }
        ],
        where: {
          id: [
            sequelize.literal(`
            SELECT TweetId
	          FROM LIKES
	          WHERE UserId = ${req.params.id}`)
          ]
        },
        group: ['TweetId'],
        raw: true,
        nest: true
      })
      return res.status(200).json(data)
    } catch (err) {
      console.log(err)
    }
  },
  getUserFollowings: async (req, res) => {
    try {
      const user = await User.findAll({
        where: { id: req.params.id },
        include: [{ model: User, as: 'Followings' }],
        raw: true,
        nest: true
      })
      const following = user.map(u => ({
        followingId: u.Followings.id,
        followingName: u.Followings.name,
        followingAccount: u.Followings.account,
        followingAvatar: u.Followings.avatar,
        followingIntro: u.Followings.introduction
      }))
      if (!user) {
        return res.status(400).json({ message: 'cannot find user' })
      }

      return res.status(200).json(following)
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: err })
    }
  },
  getUserFollowers: async (req, res) => {
    try {
      const user = await User.findAll({
        where: { id: req.params.id },
        include: [
          {
            model: User,
            as: 'Followers'
          }
        ],
        raw: true,
        nest: true
      })
      if (!user) {
        return res.status(400).json({ message: 'cannot find user' })
      }
      const followingUsers = await Followship.findAll({
        where: { followerId: helper.getUser(req).id },
        attributes: ['followingId'],
        raw: true,
        nest: true
      })
      const followingIds = followingUsers.map(a => a.followingId)
      const follower = user.map(u => ({
        followerId: u.Followers.id,
        followerAccount: u.Followers.account,
        followerName: u.Followers.name,
        followerIntro: u.Followers.introduction,
        followerAvatar: u.Followers.avatar,
        isFollowed: followingIds.includes(u.Followers.id)
      }))

      return res.status(200).json(follower)
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: err })
    }
  },
  putUser: async (req, res) => {
    // avatar, cover 尚未完成。
    try {
      await User.update(
        {
          introduction: req.body.introduction,
          name: req.body.name
        },
        { where: { id: helper.getUser(req).id } }
      )
      return res.json({ status: 200, message: 'success!' })
    } catch (err) {
      console.log(err)
      return res.json({ status: 'error', message: err })
    }
  },
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findByPk(helper.getUser(req).id, {
        raw: true,
        nest: true
      })
      return res.status(200).json(user)
    } catch (err) {
      console.log(err)
    }
  },
  postFollow: async (req, res) => {
    try {
      await Followship.create({
        followerId: helper.getUser(req).id,
        followingId: req.body.id
      })
      return res.status(200).json({ status: 200, message: '追蹤成功！' })
    } catch (err) {
      console.log(err)
      return res.json({ status: 'error', message: err })
    }
  },
  deleteFollow: async (req, res) => {
    try {
      await Followship.destroy({
        where: {
          followerId: helper.getUser(req).id,
          followingId: req.params.id
        }
      })
      return res.status(200).json({ message: '成功移除 follow' })
    } catch (err) {
      console.log(err)
      return res.json({ status: 'error', message: err })
    }
  }
}

module.exports = userController

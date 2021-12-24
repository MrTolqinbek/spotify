const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const MusicController = require('../controllers/musicController');
const PlaylistController = require('../controllers/playlistController');
router.post('/signIn', authController.signIn);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/activate/:token', authController.activate);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/resetPassword/:token', authController.resetPassword);
router.use(authController.auth);
router.patch(
	'/image',
	userController.uploadUserPhoto,
	userController.resizeUserPhoto,
	userController.updateImage
);
router.patch('/me/update', userController.update);
router.patch('/me/authupdate', userController.updateMe);
router.post('/me/playlist', PlaylistController.create);
router.get('/me/playlist', PlaylistController.getAll);
router.get('/me/playlist/:id', PlaylistController.get);
router.patch('/me/playlist/:id', PlaylistController.update);
router.patch(
	'/me/playlist/:id/image',
	PlaylistController.uploadPhoto,
	PlaylistController.resizePhoto,
	PlaylistController.updateImage
);
router.post('/me/playlist/:id/music',MusicController.uploadMusic, MusicController.create);
router.delete('/me/playlist/:id1/music/:id2', MusicController.delete);
module.exports = router;

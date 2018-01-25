module.exports.Video = function (urls, episode) {
    this.urls = urls;
    this.episode = episode;
    this.hasInfo = false;
    this.episodeTitle = "";
    this.episodeCount = "";
    this.episodePoster = "https://firebasestorage.googleapis.com/v0/b/proxsync.appspot.com/o/ic_ondemand_video_black_24px.svg?alt=media&token=fb90a1ff-ef22-4f7a-a900-48363ff27241";
};
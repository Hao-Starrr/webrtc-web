'use strict';

// 这个对象定义了我们想要获取的媒体类型和特性。
// 在这里,我们只请求视频,并且指定了一些滤镜效果。
// 这些滤镜会改变视频的颜色、饱和度、模糊度等。
const mediaStreamConstraints = {
  video: {
    filter: {
      hueRotate: 180,
      saturate: 200,
      blur: 40,
      invert: 1,
      opacity: 0.5,
    },
  },
};

// 这行代码找到页面上的<video>元素,我们稍后会将视频流放入这个元素中。
const localVideo = document.querySelector('video');

// 将被复制到视频元素中的本地流。
let localStream;

// 当成功获取到媒体流时,这个函数会被调用。
// 它将媒体流保存到localStream变量中,并将其设置为视频元素的源。
function gotLocalMediaStream(mediaStream) {
  localStream = mediaStream;
  localVideo.srcObject = mediaStream;
}

// 当获取媒体流失败时,这个函数会被调用。
// 它将错误信息记录到控制台。
function handleLocalMediaStreamError(error) {
  console.log('navigator.getUserMedia 错误: ', error);
}

// 初始化媒体流。
// 使用navigator.mediaDevices.getUserMedia方法获取媒体流。
// 这个方法接受一个包含媒体类型和特性的对象作为参数。
// 当成功获取到媒体流时,gotLocalMediaStream函数会被调用。
// 当获取媒体流失败时,handleLocalMediaStreamError函数会被调用。
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
  .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);


// 这段代码会运行在浏览器里，然后获取本机的摄像头数据，然后通过video标签展示出来。

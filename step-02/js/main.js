'use strict';

// 设置媒体流约束
// 这里只请求视频流,不包括音频
const mediaStreamConstraints = {
  video: true,
};

// 设置仅交换视频的选项
const offerOptions = {
  offerToReceiveVideo: 1,
};

// 定义通话开始时间(即对等连接建立的时间)
let startTime = null;

// 定义视频元素、流和对等连接
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

// 媒体流回调函数

// 获取本地媒体流成功后的回调函数
function gotLocalMediaStream(mediaStream) {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('接收到本地流。');
  callButton.disabled = false;  // 启用通话按钮
}

// 处理获取本地媒体流失败的情况
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia 错误: ${error.toString()}.`);
}

// 处理远程媒体流成功接收的情况
function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('远程对等连接接收到远程流。');
}

// 视频流行为

// 记录视频元素加载完成时的尺寸信息
function logVideoLoaded(event) {
  const video = event.target;
  trace(`${video.id} 视频宽度: ${video.videoWidth}px, ` +
        `视频高度: ${video.videoHeight}px.`);
}

// 记录视频开始流式传输时的尺寸信息和设置时间
function logResizedVideo(event) {
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`设置时间: ${elapsedTime.toFixed(3)}ms.`);
  }
}

// 为视频元素添加事件监听器
localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

// RTCPeerConnection 行为定义


//、、 交换ICE部分，包括candidate

// 处理新的ICE候选者
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    // 将新的ICE候选者添加到另一个对等连接
    otherPeer.addIceCandidate(newIceCandidate)
      .then(() => {
        handleConnectionSuccess(peerConnection);
      }).catch((error) => {
        handleConnectionFailure(peerConnection, error);
      });

    trace(`${getPeerName(peerConnection)} ICE 候选者:\n` +
          `${event.candidate.candidate}.`);
  }
}

// 记录连接成功的日志
function handleConnectionSuccess(peerConnection) {
  trace(`${getPeerName(peerConnection)} addIceCandidate 成功。`);
};

// 记录连接失败的日志
function handleConnectionFailure(peerConnection, error) {
  trace(`${getPeerName(peerConnection)} 添加 ICE 候选者失败:\n`+
        `${error.toString()}.`);
}

// 记录连接状态变化
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE 状态变化事件: ', event);
  trace(`${getPeerName(peerConnection)} ICE 状态: ` +
        `${peerConnection.iceConnectionState}.`);
}


// 交换SDP部分，包括offer和answer和description

// 处理会话描述设置失败的情况
function setSessionDescriptionError(error) {
  trace(`创建会话描述失败: ${error.toString()}.`);
}

// 记录会话描述设置成功的日志
function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} 完成。`);
}

// 记录本地描述设置成功的日志
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// 记录远程描述设置成功的日志
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// offer去的过程
// 处理创建offer的结果,并设置本地和远程会话描述
function createdOffer(description) {
  trace(`来自localPeerConnection的Offer:\n${description.sdp}`);

  // 发offer的人，记下offer
  trace('localPeerConnection setLocalDescription 开始。');
  localPeerConnection.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);

  // 收offer的人，记下offer
  trace('remotePeerConnection setRemoteDescription 开始。');
  remotePeerConnection.setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(remotePeerConnection);
    }).catch(setSessionDescriptionError);

  // 收offer的人，创建answer
  trace('remotePeerConnection createAnswer 开始。');
  remotePeerConnection.createAnswer()
    .then(createdAnswer)
    .catch(setSessionDescriptionError);
}

// answer回的过程
// 处理创建answer的结果,并设置本地和远程会话描述
function createdAnswer(description) {
  trace(`来自remotePeerConnection的Answer:\n${description.sdp}.`);

  // 发answer的人，记下answer
  trace('remotePeerConnection setLocalDescription 开始。');
  remotePeerConnection.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(remotePeerConnection);
    }).catch(setSessionDescriptionError);

  // 收answer的人，记下answer
  trace('localPeerConnection setRemoteDescription 开始。');
  localPeerConnection.setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);
}

// 定义和添加按钮行为

// 获取按钮元素
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// 设置初始按钮状态:禁用通话和挂断按钮
callButton.disabled = true;
hangupButton.disabled = true;

// 处理开始按钮动作:创建本地媒体流
function startAction() {
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace('请求本地流。');
}

// 处理通话按钮动作:创建对等连接
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('开始通话。');
  startTime = window.performance.now();

  // 获取本地媒体流轨道
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`使用视频设备: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`使用音频设备: ${audioTracks[0].label}.`);
  }

  const servers = null;  // 允许配置RTC服务器

  //、、 创建对等连接并添加行为
  localPeerConnection = new RTCPeerConnection(servers);
  trace('创建本地对等连接对象 localPeerConnection。');

  //、、 获取和共享网络信息，包括ICE，candidate
  localPeerConnection.addEventListener('icecandidate', handleConnection);
  localPeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);

  remotePeerConnection = new RTCPeerConnection(servers);
  trace('创建远程对等连接对象 remotePeerConnection。');

  remotePeerConnection.addEventListener('icecandidate', handleConnection);
  remotePeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);
  remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

  //、、 将本地流添加到连接并创建offer以建立连接
  localPeerConnection.addStream(localStream);
  trace('将本地流添加到 localPeerConnection。');
  
  //、、 获取并共享媒体信息，包括description，offer和answer
  trace('localPeerConnection createOffer 开始。');
  localPeerConnection.createOffer(offerOptions)
    .then(createdOffer).catch(setSessionDescriptionError);
}

// 处理挂断动作:结束通话,关闭连接并重置对等连接
function hangupAction() {
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('结束通话。');
}

// 为按钮添加点击事件处理程序
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

// 定义辅助函数

// 获取"另一个"对等连接
function getOtherPeer(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      remotePeerConnection : localPeerConnection;
}

// 获取特定对等连接的名称
function getPeerName(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
}

// 在控制台记录操作(文本)及其发生时间
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}

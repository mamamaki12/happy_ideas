// サーバーなしの WebRTC 接続。接続情報（SDP）を「コード」にして、LINEなどで手渡しする。
// STUN は公開サーバー（Google）を使う。TURN がないので、通信環境によってはつながらない（それも検証結果）。
import { encodeData, decodeData } from './urldata.js';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

function waitIce(pc, ms = 4000) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
const pack = (desc) => encodeData({ t: desc.type, s: desc.sdp });
const unpack = (code) => {
  const d = decodeData(String(code).trim().replace(/^.*#c=/, ''), 60000);
  if (!d || (d.t !== 'offer' && d.t !== 'answer') || typeof d.s !== 'string') throw new Error('接続コードが正しくありません');
  return { type: d.t, sdp: d.s };
};

/**
 * @param {{stream?: MediaStream, onTrack?: (s: MediaStream) => void, onMessage?: (data: any) => void, onState?: (s: string) => void, iceServers?: any[]}} opts
 */
export function createPeer({ stream, onTrack, onMessage, onState, iceServers = ICE } = {}) {
  const pc = new RTCPeerConnection({ iceServers });
  let channel = null;
  stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.ontrack = (e) => onTrack?.(e.streams[0]);
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
  const bind = (ch) => { channel = ch; ch.binaryType = 'arraybuffer'; ch.onmessage = (e) => onMessage?.(e.data); ch.onopen = () => onState?.('channel-open'); };
  pc.ondatachannel = (e) => bind(e.channel);
  return {
    pc,
    /** 招待する側: 招待コードを作る */
    async invite() { bind(pc.createDataChannel('data')); await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc); return pack(pc.localDescription); },
    /** 招待された側: 招待コードから返事コードを作る */
    async accept(code) { await pc.setRemoteDescription(unpack(code)); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc); return pack(pc.localDescription); },
    /** 招待した側: 返事コードを受け取って接続 */
    async finish(code) { const d = unpack(code); if (d.type !== 'answer') throw new Error('返事のコードを貼ってください'); await pc.setRemoteDescription(d); },
    send(data) { if (channel?.readyState === 'open') { channel.send(data); return true; } return false; },
    get channel() { return channel; },
    close() { channel?.close(); pc.close(); },
  };
}

/** 大きなデータ（写真など）を分割して送る */
export async function sendChunked(peer, meta, buf, chunk = 16000) {
  peer.send(JSON.stringify({ k: 'start', ...meta, size: buf.byteLength }));
  for (let i = 0; i < buf.byteLength; i += chunk) {
    while (peer.channel.bufferedAmount > 1_000_000) await new Promise((r) => setTimeout(r, 30));
    peer.send(buf.slice(i, i + chunk));
  }
  peer.send(JSON.stringify({ k: 'end' }));
}

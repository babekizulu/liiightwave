import QRCode from 'qrcode';
export async function renderTalisman(payload){
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1000;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#03121d';ctx.fillRect(0,0,1000,1000);ctx.strokeStyle='#b9d5de';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(500,45);ctx.lineTo(960,890);ctx.lineTo(40,890);ctx.closePath();ctx.stroke();
 const seed=payload.art.seed;
 for(let i=0;i<22;i++){const y=155+i*28,width=(y-45)*.53;ctx.globalAlpha=.12+(seed.charCodeAt(i)%5)*.035;ctx.beginPath();ctx.moveTo(500-width,y);ctx.lineTo(500+width,y);ctx.stroke();}
 ctx.globalAlpha=1;
 const qr=document.createElement('canvas');await QRCode.toCanvas(qr,JSON.stringify(payload),{width:380,margin:4,errorCorrectionLevel:'M',color:{dark:'#03121d',light:'#ffffff'}});
 ctx.drawImage(qr,310,450);ctx.fillStyle='#e2edf2';ctx.font='22px Georgia';ctx.textAlign='center';ctx.fillText('LiiiGHTWAVE · TALISMAN / 01',500,950);
 return canvas;
}

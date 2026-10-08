import {useEffect,useRef} from 'react';
export default function Wave({enabled}) {
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame,width,height,start=performance.now();
    const pointer={x:.5,y:.5};
    function resize(){width=window.innerWidth;height=window.innerHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
    function move(event){pointer.x=event.clientX/width;pointer.y=event.clientY/height;}
    function draw(now){
      const t=enabled&&!reduced ? (now-start)*.00012 : 0;
      ctx.clearRect(0,0,width,height);
      const gap=width<600?28:30;
      function point(x,y){
        const nx=x/width,ny=y/height;
        const bend=Math.sin(nx*11+ny*5+t)*Math.cos(ny*10-nx*3-t*.6);
        const swell=Math.sin(nx*7-ny*8-t)*Math.cos(nx*9+ny*2+t*.4);
        const dx=(nx-pointer.x),dy=(ny-pointer.y),pull=Math.exp(-(dx*dx+dy*dy)*12);
        return [x+bend*35+(enabled?dx*pull*38:0),y+swell*36+(enabled?dy*pull*38:0)];
      }
      ctx.lineWidth=.7;
      for(let x=-gap*3;x<width+gap*3;x+=gap){ctx.beginPath();for(let y=-gap*3;y<height+gap*3;y+=8){const [px,py]=point(x,y);y===-gap*3?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.strokeStyle='rgba(94,151,184,0.14)';ctx.stroke();}
      for(let y=-gap*3;y<height+gap*3;y+=gap){ctx.beginPath();for(let x=-gap*3;x<width+gap*3;x+=8){const [px,py]=point(x,y);x===-gap*3?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.strokeStyle='rgba(94,151,184,0.12)';ctx.stroke();}
      if(enabled&&!reduced)frame=requestAnimationFrame(draw);
    }
    const onResize=()=>{resize();if(!enabled||reduced)draw(performance.now());};
    resize();draw(start);window.addEventListener('resize',onResize);window.addEventListener('pointermove',move);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',onResize);window.removeEventListener('pointermove',move);};
  },[enabled]);
  return <div className="wave-layer" aria-hidden="true"><canvas ref={ref}/><div className="wave-shade"/></div>;
}

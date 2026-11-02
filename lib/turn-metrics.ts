// Local performance inspection only; no network telemetry or visible product UI.
export function turnMetrics(){
  let start=-1,last=0,delay=0;let frames:number[]=[];
  return (canvas:HTMLCanvasElement,turn:{start:number;dragging?:boolean}|null,vertices:number,textures:number)=>{
    if(typeof location==='undefined'||location.hostname!=='127.0.0.1'||!turn||turn.dragging)return;
    const now=performance.now();if(start!==turn.start){start=turn.start;frames=[];delay=now-start;}else frames.push(now-last);last=now;
    const sorted=[...frames].sort((a,b)=>a-b);canvas.dataset.albumTurnMetrics=JSON.stringify({startDelayMs:Math.round(delay*10)/10,frameP95Ms:Math.round((sorted[Math.floor(sorted.length*.95)]||0)*10)/10,maxFrameMs:Math.round((sorted.at(-1)||0)*10)/10,frames:frames.length,vertices,textures});
  };
}

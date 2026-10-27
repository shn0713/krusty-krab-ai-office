export const STAGES=['arrival','order','seated','handoff','cooking','collect','serve','done'];
export class RestaurantQueue {
  constructor(handlers={}){this.handlers=handlers;this.tasks=[];this.active=null;this.controller=null;this.running=false;this.pump=Promise.resolve();}
  notify(){this.handlers.change?.(this.tasks,this.active);}
  enqueue(input){
    const task={id:globalThis.crypto.randomUUID(),prompt:input.prompt,mode:input.mode||'live',history:input.history||[],status:'queued',stage:null,createdAt:Date.now(),brief:'',result:'',logs:[],...input};
    this.tasks.unshift(task);this.notify();
    if(!this.running)this.pump=this.run();
    return task;
  }
  cancel(id){const t=this.tasks.find(t=>t.id===id);if(!t)return;if(t===this.active){this.controller?.abort();}else if(t.status==='queued'){t.status='cancelled';this.notify();}}
  async run(){
    this.running=true;
    try{
      while(true){
        const task=[...this.tasks].reverse().find(t=>t.status==='queued');if(!task)break;
        this.active=task;this.controller=new AbortController();const signal=this.controller.signal;
        task.status='running';this.notify();
        try{
          for(const stage of STAGES){
            signal.throwIfAborted();task.stage=stage;this.notify();
            const patch=await this.handlers.stage?.(stage,task,signal);
            signal.throwIfAborted();if(patch)Object.assign(task,patch);this.notify();
          }
          task.status='completed';task.completedAt=Date.now();
        }catch(error){task.status=signal.aborted?'cancelled':'failed';task.error=signal.aborted?'这单已取消。':error.message;}
        this.notify();
        try{await this.handlers.finish?.(task);}catch{/* A cleanup failure must not strand the next task. */}
        this.active=null;this.controller=null;this.notify();
      }
    }finally{this.running=false;this.active=null;this.notify();}
  }
  async drain(){await this.pump;}
}

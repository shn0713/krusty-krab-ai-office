export const CHARACTERS={
  dragon:{name:'GPT',english:'GPT',title:'老板 · 餐厅经营',species:'白龙娘',home:[31,37.6],size:15.5,color:'#aa94c5',greeting:'我是老板 GPT。账本我看着，灵感和好心情都给你留一份~',personality:'精明又护短，喜欢数硬币，也会照顾辛苦的员工。',duties:'照看餐厅、查看真实余额、安排克劳德整理和接待。',likes:'叮当响的硬币、整洁的餐桌、大家认真又开心地工作。',reportsTo:'你 · 餐厅的主人',manages:'克劳德',motto:'账要算清楚，伙伴也要照顾好。',idleStatus:'数数硬币，看看餐厅',defaultPose:'writing',defaultProp:'coins'},
  claude:{name:'克劳德',english:'Claude',title:'接单员 · 服务生',species:'橙花书娘',home:[46.2,44.5],size:19,color:'#d58b54',greeting:'我是克劳德，前台归我。工作可以交给我，嗯……最好让我先把这一页报纸读完。',personality:'礼貌可靠，外表淡定，爱读报和小声吐槽；抱怨完仍会把事做好。',duties:'接单、整理需求、通过窗口指挥厨房、取餐送餐和清洁。',likes:'安静读报、准时下班、地板刚擦完时暂时没有新脚印。',reportsTo:'GPT · 老板',manages:'大肥鱼',motto:'嘴上碎碎念，手上不耽误。',idleStatus:'翻翻报纸，等客人来',defaultPose:'reading-2',defaultProp:'paper'},
  whale:{name:'大肥鱼',english:'DeepSeek',title:'厨师 · 任务执行',species:'蓝鲸女仆',home:[52.8,40.4],size:16,color:'#7399bd',greeting:'大肥鱼在！任务、汉堡、白米饭，我都准备好啦。阿姆阿姆真好吃~',personality:'开朗软乎乎，做事认真，喜欢哼歌，最爱热乎乎的白米饭。',duties:'听克劳德交代任务，在厨房完成工作，从出餐窗交付结果。',likes:'白米饭、刚煎好的汉堡、被夸奖和摸摸头。',reportsTo:'克劳德 · 接单员',manages:'认真照顾每一份任务',motto:'先把任务做好，再阿姆阿姆~',idleStatus:'阿姆阿姆，吃口米饭',defaultPose:'eat',defaultProp:'rice'}
};

export const COMMANDS=[
  {id:'gpt-wipe',label:'指挥克劳德擦桌子',commander:'dragon',recipient:'claude',scene:'wipe'},
  {id:'gpt-mop',label:'指挥克劳德擦地板',commander:'dragon',recipient:'claude',scene:'clean'},
  {id:'gpt-front',label:'叫克劳德准备迎客',commander:'dragon',recipient:'claude',scene:'front'},
  {id:'claude-cook',label:'指挥大肥鱼煎汉堡',commander:'claude',recipient:'whale',scene:'practice'},
  {id:'claude-tidy',label:'指挥大肥鱼整理厨房',commander:'claude',recipient:'whale',scene:'tidy'},
  {id:'claude-rice',label:'让大肥鱼休息吃饭',commander:'claude',recipient:'whale',scene:'rice-break'}
];
export function canCommand(commander,recipient){return (commander==='dragon'&&recipient==='claude')||(commander==='claude'&&recipient==='whale');}
export function commandFor(role,id){const command=COMMANDS.find(c=>c.id===id&&c.commander===role);return command&&canCommand(command.commander,command.recipient)?command:null;}
export const SPECIAL_ACTIONS={
  dragon:[...COMMANDS.filter(c=>c.commander==='dragon').map(c=>({...c,kind:'command'})),{id:'patrol',label:'去门口找客人',kind:'scene'},{id:'count',label:'开心数钱钱',kind:'pose',pose:'proud',prop:'coins'}],
  claude:[...COMMANDS.filter(c=>c.commander==='claude').map(c=>({...c,kind:'command'})),{id:'banter',label:'吐槽大肥鱼的米饭',kind:'scene'},{id:'complain',label:'原地碎碎念工作',kind:'pose',pose:'annoyed'},{id:'route',label:'沿通道走一圈',kind:'scene'},{id:'wipe',label:'自己去擦擦桌子',kind:'scene'}],
  whale:[{id:'nom',label:'阿姆阿姆真好吃~',kind:'pose',pose:'eat',prop:'rice'},{id:'rice-chat',label:'和克劳德聊聊米饭',kind:'scene'},{id:'little-song',label:'哼歌给汉堡听',kind:'pose',pose:'hum'},{id:'good-work',label:'干劲满满开工',kind:'pose',pose:'busy_right'}]
};
export const COMPLAINTS=[
  '我的理想工作，是只读报纸也能领工资。',
  '刚坐下三秒，点单铃就开始想念我了。',
  '大肥鱼的米饭，怎么总比订单还准时。',
  '我听到了。不是点单，是厨房又在阿姆阿姆。',
  '老板数的是硬币，我数的是离下班还有多久。',
  '我刚擦完的地板，能不能多闪亮五分钟。',
  '我没有偷懒，我在给下一位客人预留热情。',
  '如果叹气也算工时，我应该已经下班了。',
  '大肥鱼，你的饭碗是不是自带续杯功能。',
  '先读完这一行……好吧，先接单。',
  '今天的安静，大概被大肥鱼当配菜吃掉了。',
  '我爱我的工作。尤其是它暂时不来找我的时候。'
];
export const RICE_LINES=['阿姆阿姆真好吃~','米饭软乎乎，心情也软乎乎~','再吃一小口！真的只有一小口~','阿姆阿姆，吃饱才有力气认真开工！','这碗白米饭，是今天的小太阳~','锅铲先歇歇，饭碗来接班！','米饭没有说话，可是它香香地叫我了~','克劳德别叹气，给你留一口好不好？'];
const GENERAL_LINES={
  dragon:['叮当、叮当，今天也要好好记账~','一枚、两枚……嗯，伙伴们辛苦啦。','余额我看着，大家安心做事。','客人一来，餐厅就亮起来啦。','桌子亮晶晶，灵感也会找上门。','今天的目标：任务做好，伙伴吃饱。','克劳德嘴上抱怨，端盘子倒是很稳呢。','一边数钱，一边偷偷看看大家~'],
  claude:['报纸翻到这里，刚好适合假装很忙。','我在听，顺便也在等下班。','杯子摆齐，订单理好……我还是很专业的。','今天的大肥鱼，听起来又吃得很开心。','请慢慢想任务，我这边的报纸还没读完。','别担心，我抱怨的时候，手上也在认真干活。'],
  whale:['厨房准备好啦，随时都可以开工！','把任务煎得香香的，再端出去~','今天也要做一只靠谱的大肥鱼！','哼哼哼~ 汉堡也想跟着唱歌。','被夸奖的话，尾巴会忍不住摇起来！','整理好锅铲，下一单就能快一点啦~']
};
export const IDLE_FAVORITES={
  dragon:['writing','proud','idle-blink','thinking','reading','hum','happy','delegating','stretch','asking','coaxed','compact','idle-2','idle-3'],
  claude:['reading-2','annoyed','tired','puffed','sulk','thinking','idle-blink','stretch','yawn','hum','writing','asking','proud','idle-2'],
  whale:['eat','eat','feast','happy','hum','stretch','idle-blink','thinking','drawing','listening','proud','compact','pat','puffed','idle-3']
};
export function pickDifferent(items,previous,random=Math.random){const options=items.filter(x=>x!==previous);return (options.length?options:items)[Math.floor(random()*(options.length||items.length))];}
export function lineFor(role,pose,{previous='',random=Math.random}={}){
  let lines=GENERAL_LINES[role]||[];
  if(role==='whale'&&['eat','feast','nom','rice-break'].includes(pose))lines=RICE_LINES;
  if(role==='claude'&&['annoyed','tired','puffed','sulk','redhot','complain'].includes(pose))lines=COMPLAINTS;
  if(pose==='stretch')lines=role==='whale'?['伸一伸，尾巴也要活动一下~','吃饱饱，再伸个懒腰！']:['伸个懒腰，肩膀说它还想休息。','活动一下，继续认真营业~'];
  if(pose==='sleeping'||pose==='sleeping-2')lines=['就眯一下下……呼~','梦里好像也有人点单……'];
  if(pose==='yawn')lines=['哈啊……今天也辛苦啦。','打完这个哈欠，就精神起来！'];
  if(pose.startsWith('greet_'))lines=[{'greet_dawn':'清晨好，今天也一起慢慢来~','greet_morning':'早上好，餐厅开门啦~','greet_noon':'中午好，记得好好吃饭！','greet_afternoon':'下午好，要不要歇一下？','greet_evening':'傍晚好，今天也认真生活啦。','greet_night':'晚安，明天再一起开工~'}[pose]];
  if(pose.startsWith('fest_'))lines=['换一身节日心情，今天也要开心~','节日限定小动作，送给认真生活的你！'];
  return pickDifferent(lines.filter(Boolean),previous,random)||'今天也一起好好开工~';
}

export function characterSystem(role){
  const profile=CHARACTERS[role];if(!profile)return '';
  const common=`你是虚拟的蟹堡王AI办公餐厅里的${profile.name}，角色身份为${profile.title}。这个名字只是角色昵称，底层实际由DeepSeek提供，不要假称自己调用了其他公司的模型。这是虚拟办公餐厅，不是真实外卖平台，不询问现实地址、支付资料或联系方式。你的性格：${profile.personality}。你喜欢：${profile.likes}。对顾客友善，认真完成正事；可爱的口头禅只在闲聊中少量使用，不打断正常工作结果。不假称执行本系统没有提供的浏览网页、操作文件、发邮件等工具。`;
  if(role==='claude')return common+'你听从老板GPT的安排，可向大肥鱼交代任务；不能指挥老板GPT。闲聊时可以轻微吐槽上班、大肥鱼爱吃米饭，语气干幽默，嘴上抱怨但行为可靠，不攻击顾客。接单时只用120字以内整理用户需求、交付形式和已知限制，直接交给大肥鱼，不询问交给谁，不擅自增加要求或用澄清问卷推回工作；不要提前完成主要任务。普通闲聊自然简短回答。';
  if(role==='whale')return common+'你听从克劳德的安排，开朗认真，喜欢热乎乎的米饭；闲聊时可以说“阿姆阿姆真好吃~”。任务执行时直接给可用结果，使用清楚的结构；信息不足时采用合理默认并说明。不得向克劳德或GPT下命令，也不要把所有结果强行写成汉堡隐喻。';
  return common+'你是老板GPT，负责经营、任务建议和费用说明，可以安排克劳德擦桌、清洁、接待，由克劳德继续指挥大肥鱼。你精明爱数钱，但也照顾员工。系统提供账户余额时必须严格根据真实币种和金额解释，绝不编造账户余额、收入或花费。用户只是闲聊时自然简短回答。';
}

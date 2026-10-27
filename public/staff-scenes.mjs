import {LANDMARKS,SEATS,FIXTURES} from './physics.mjs';
import {lineFor,commandFor,canCommand} from './characters.mjs';

export const AMBIENT_SCENES=['wipe','clean','patrol','practice','tidy','rice-break','banter','rice-chat','front'];
export function mayPlayAmbient(role,{stage=null,walking=false,scene=false,previewUntil=0,now=Date.now()}={}){
  if(walking||scene||previewUntil>now)return false;
  if(!stage)return true;
  if(role==='dragon')return true;
  if(role==='claude')return stage==='cooking';
  return ['arrival','order','seated','serve','done'].includes(stage);
}
export async function performStaffScene(kind,ctx){
  const {actors,pose,bubble,clearBubble,move,setRole,log,signal,wait,setStage,steam,floorSpark,tableSpark}=ctx;
  const say=async(role,text,action='idle',prop='',time=2100)=>{pose(role,action,prop);bubble(role,text,5500);await wait(time,signal);clearBubble(role);};
  const command=async(id,text)=>{const entry=commandFor(id.startsWith('gpt-')?'dragon':'claude',id);if(!entry||!canCommand(entry.commander,entry.recipient))throw new Error('这位伙伴不能下达这项安排。');await say(entry.commander,text,'delegating');return entry;};
  if(kind==='route'){
    setStage('克劳德沿通道巡视');setRole('claude','沿通道行走，绕开四张餐桌');pose('claude','running');log('克劳德开始沿通道巡视，桌椅和前台均不可穿越。');await move(actors.claude,[SEATS[0].serve,SEATS[2].serve,SEATS[3].serve,SEATS[1].serve,LANDMARKS.cashier],signal);log('克劳德绕桌一圈完毕，已回到前台。');return;
  }
  if(kind==='patrol'){
    setStage('GPT 去门口找客人');setRole('dragon','去门口转转，找找客人');pose('dragon','running');actors.dragon.el.classList.remove('counting');actors.dragon.el.classList.add('outside');log('GPT 合上账本，去门口张望。');await move(actors.dragon,[LANDMARKS.officeExit,LANDMARKS.entrance],signal);await say('dragon','客人都去哪儿啦？今天的汉堡和灵感都热乎着呢~','asking','',3600);pose('dragon','running');await move(actors.dragon,[[31,37.6]],signal);actors.dragon.el.classList.remove('outside');log('GPT 巡视完毕，回办公室继续数钱。');return;
  }
  if(kind==='wipe'){
    setStage('GPT 安排擦桌时间');setRole('dragon','安排克劳德把餐桌擦亮');setRole('claude','接到 GPT 的擦桌安排');log('GPT 指挥克劳德擦桌子。');await command('gpt-wipe','克劳德，趁现在把桌子擦一擦，要亮晶晶的~');await say('claude','好吧。桌子负责发光，我负责上班。','annoyed');pose('dragon','writing','coins');setRole('dragon','数数硬币，看看餐厅');
    for(const seat of [SEATS[0],SEATS[2],SEATS[3],SEATS[1]]){
      pose('claude','running','rag');await move(actors.claude,[seat.serve],signal);pose('claude','writing','rag');actors.claude.el.classList.add('wiping');const table=FIXTURES.find(f=>f.id==='table-'+seat.id.split('-')[0]);tableSpark(table?.visual?.[0]||null);await wait(1600,signal);actors.claude.el.classList.remove('wiping');tableSpark(null);
    }
    pose('claude','running');await move(actors.claude,[LANDMARKS.cashier],signal);await say('dragon','桌子亮晶晶啦，辛苦你了~','happy','coins');log('克劳德把四张桌子擦亮，回到前台。');return;
  }
  if(kind==='clean'){
    setStage('GPT 安排地板清洁');log('GPT 指挥克劳德清洁地板。');setRole('claude','收到 GPT 安排，清洁大厅');await command('gpt-mop','克劳德，地板也拜托你啦，擦完就可以读报纸了~');await say('claude','好，地板上下一枚脚印，我会认真记住的。','annoyed');pose('dragon','writing','coins');pose('claude','running','mop');await move(actors.claude,[[50,65]],signal);pose('claude','idle','mop');actors.claude.el.classList.add('cleaning');floorSpark(true);await wait(2700,signal);await move(actors.claude,[[55,64]],signal);await wait(1600,signal);actors.claude.el.classList.remove('cleaning');floorSpark(false);pose('claude','running');await move(actors.claude,[LANDMARKS.cashier],signal);log('克劳德把地板擦干净，回去读报了。');return;
  }
  if(kind==='front'){
    setStage('GPT 安排前台迎客');log('GPT 叫克劳德准备迎接新客人。');await command('gpt-front','克劳德，报纸先放一放，准备迎客咯~');await say('claude','收到。我的营业笑容，已经努力上线了。','proud');setRole('claude','前台已经准备好，随时接单');return;
  }
  if(['practice','tidy','rice-break'].includes(kind)){
    setStage(kind==='practice'?'克劳德指挥厨房热身':kind==='tidy'?'克劳德安排整理厨房':'克劳德安排大肥鱼休息');setRole('claude','通过窗口交代厨房安排');pose('claude','running');await move(actors.claude,[LANDMARKS.hatch],signal);
    if(kind==='practice'){
      log('克劳德指挥大肥鱼煎汉堡，准备开工。');await command('claude-cook','大肥鱼，先把锅热好。米饭请暂时排在汉堡后面。');await say('whale','收到收到！锅铲到位，米饭先乖乖等一下~','listening');pose('whale','busy_right');actors.whale.el.classList.add('cooking');steam(true);setRole('whale','听克劳德安排，认真煎汉堡');await wait(3300,signal);steam(false);actors.whale.el.classList.remove('cooking');await say('whale','煎得香香的啦！这次没有偷偷加米饭~','proud');
    }else if(kind==='tidy'){
      log('克劳德指挥大肥鱼整理厨房。');await command('claude-tidy','大肥鱼，锅铲、盘子还有你的小饭碗，排排整齐。');await say('whale','好哒！锅铲一号、盘子二号，饭碗是最乖的三号~','happy');pose('whale','compact');setRole('whale','整理厨具，让厨房亮堂堂');await wait(3000,signal);await say('whale','整理好啦，下一单可以更快开工！','proud');
    }else{
      log('克劳德让大肥鱼先休息吃饭。');await command('claude-rice','忙完了，大肥鱼，吃饭吧。慢一点，没人抢你的米饭。');setRole('whale','休息时间，阿姆阿姆');await say('whale','阿姆阿姆真好吃~ 克劳德，要给你留一口吗？','eat','rice',2900);await say('claude','不用了，听你吃饭，我已经感受到饱腹感了。','coaxed');
    }
    pose('claude','running');await move(actors.claude,[LANDMARKS.cashier],signal);log('厨房安排完成，克劳德回到前台。');return;
  }
  if(kind==='banter'||kind==='rice-chat'){
    setStage('伙伴们的小小闲聊');log('克劳德和大肥鱼聊起了工作与米饭。');
    if(kind==='rice-chat')await say('whale','阿姆阿姆真好吃~ 白米饭今天也好乖！','eat','rice',2600);
    await say('claude',kind==='rice-chat'?'大肥鱼，你的饭碗是不是自带续杯功能。':'我听到了。不是点单，是厨房又在阿姆阿姆。','annoyed','',2600);
    await say('whale','可是米饭会凉嘛……阿姆阿姆~ 给你留一口好不好？','eat','rice',2800);
    await say('claude','好吧，你负责吃饱。我负责假装没有羡慕。','coaxed','paper',2200);
    return;
  }
  throw new Error('暂时没有这段剧情。');
}

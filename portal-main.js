import config from './portal-config.js';
import {validConfiguration,createPortalApi,takeRecoveryFragment} from './portal-api.js';
import {startPortal} from './portal-app.js';
import {mountPortal} from './portal-ui.js';

const root=document.getElementById('portal-root');
const recovery=takeRecoveryFragment(location,history);
if(!validConfiguration(config,location.hostname)){
  mountPortal(root,{}).showUnavailable('Das Portal ist noch nicht freigeschaltet. Bei Fragen wende dich bitte direkt an Josef.');
}else if(!globalThis.supabase?.createClient){
  mountPortal(root,{}).showUnavailable('Das Portal konnte nicht geladen werden. Bitte später erneut versuchen.');
}else{
  const app=startPortal({root,api:createPortalApi(config,globalThis.supabase.createClient),courseDates:globalThis.LCCourseData.dates});
  if(recovery)app.restoreRecovery(recovery);
}

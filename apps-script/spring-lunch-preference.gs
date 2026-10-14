function configureSpringLunchPreference() {
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try {
  const sh=getSheet_(), c=getColumns_(sh), map=mapColumns_(sh);
  const red=map["レッドカーペット"], lunch=map["新春ランチ開催場所希望"];
  if(c.paid!==12 || red!==27 || lunch!==28)throw new Error("既存の管理列と新しい希望列の位置をご確認ください。");
  const count=sh.getLastRow(), before=sh.getRange(1,1,count,27).getValues();
  const header=sh.getRange(1,lunch);
  header.setBackground("#861E2C").setFontColor("#ffffff").setFontWeight("bold").setWrap(true);
  sh.setColumnWidth(lunch,260);
  const choices=["東京開催","名古屋開催","どちらでも参加可能"];
  sh.getRange(2,lunch,sh.getMaxRows()-1,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(choices,true).setAllowInvalid(false).build());
  const area=sh.getRange(2,1,sh.getMaxRows()-1,sh.getLastColumn());
  const formulas=['=AND($B2<>"",$L2=TRUE)','=AND($B2<>"",$L2<>TRUE)'];
  sh.setConditionalFormatRules(sh.getConditionalFormatRules().map(rule=>{const condition=rule.getBooleanCondition();return condition && formulas.includes(String(condition.getCriteriaValues()[0]))?rule.copy().setRanges([area]).build():rule;}));
  SpreadsheetApp.flush();
  const unchanged=JSON.stringify(before)===JSON.stringify(sh.getRange(1,1,count,27).getValues());
  if(!unchanged)throw new Error("既存の記録保持を確認してください。");
  console.log(JSON.stringify({redCarpetColumn:red,lunchLocationColumn:lunch,choices,existingRecordsUnchanged:unchanged,highlightRanges:sh.getConditionalFormatRules().map(rule=>rule.getRanges().map(range=>range.getA1Notation())),mailSent:false,triggersChanged:false}));
 } finally {lock.releaseLock();}
}

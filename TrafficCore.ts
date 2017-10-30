/*
    * create automatic taffic Signal system using typescript 
    * Any case of Emergency should allow the to pass 
    * Default Values : 
        Number of Cross  =  4
        Timer value = 60 Sec
    Road 
    Junction 
    Signal (G->Y->R->G...)
    
    Road contain Junction (traffic singal) 
    A Junction can have N no.of Crosses (Default 4)
    Each Cross have each signal
    Each Signal have 3 Type(Green -> Yellow -> Red -> Green -> ....)
    
    The risk of Junction controller is to pass the vehicle if Emergency come. 
    
    Road delegate a controller to a junction 
    the controller will handle signal processing 
    the controller will handle Emergency situation  
*/
enum CtrlerCMD {
    PROCESS_NEXT = "100",
    EMERGENCY = "101",
    ALLOW_ALL_TO_PASS = "102",
    TIMER_REACH_AT_END = "103",
    STOP_ALL   = "104",
    TIMER_REACH_TRANSITION_TIME = "105";    
}
interface ISignal{
    signals: {
        green: "GREEN",
        yellow: "YELLOW",
        red: "RED",
    }
    
}
interface ITraffic{    
    from: string;
    to: [];
    timerValue: number;
    hasEmergency: boolean;
}
abstract class Communicator{
    constructor(){}
    abstract observer(): void;
    abstract notify(): void;
}    
/*   
        TIMER 
*/
class Timer extends Communicator{    
    startFrom: number;
    endTo: number;
    transitionTime: number;
    timer: any;
    constructor(startTime: number,endTime:number,transitionTime){        
        this.startFrom = startTime;
        this.endTo = endTime;
        this.transitionTime = transitionTime;   
        // id of timer div give here
    }
    startCountDown(timervalue,callBack,shouldNotifyTransitionTime){
        let _this = this;
        let _timer = timervalue;        
        if(shouldNotifyTransitionTime){
            let transitionTime =  _timer - _this.transitionTime;
            transitionTime = _timer - transitionTime;
        }        
        _this.timer = setInterval(function(){           
            if(timervalue){
                _this.showTime(_timer);
                if(_timer == 0){
                    _this.notify(CtrlerCMD.TIMER_REACH_AT_END);
                }
                else if(shouldNotifyTransitionTime && _timer == transitionTime){ 
                     _this.notify(CtrlerCMD.TIMER_REACH_TRANSITION_TIME);
                }
                else{
                     callBack && callBack(); 
                }
            }
            else{
                 callBack && callBack(); 
            }            
            _timer--;
        }, 1000);
    }
    stopCountDown(){
        clearInterval(this.timer);
        this.timer = null;
    }
    showTime(time){
        console.log(time);
        // show time in DIV 
    }
    resetTimer(){}
    notify(cmd){
        this.broadcasttoController(cmd);
    }
    observer(){
        console.log("i'm observer")
    }
    broadcasttoController(cmd){        
        controller.observer(cmd)
    }
}    
/*   
        CONTROLLER 
*/
class TrafficContrller extends Communicator{
    crossList: [];
    queueList: [];
    activeIndex: number = 0;
    emergency =  {
        wasEmergency : false,
        index: null,
    };
    
    constructor(){
        super();
    }
    init(tJunction,crossList){
        var _self = this
        _self.crossList = crossList;
        tJunction.allowAllCrossToPass(3);
        _self.delay(function(){
            tJunction.stopAllCross();            
            _self.startWork(tJunction);
        });       
    }
    resetQueue(){
        this.queueList = this.crossList;
    }
    startWork(tJunction){
        this.activeIndex = 0;
        this.resetQueue();
        this.queueList[this.activeIndex].allowToPass(this.queueList[this.activeIndex].option.timerValue); 
    }
    observer(cmd,emergencyIndex){
        if(cmd == CtrlerCMD.TIMER_REACH_AT_END){
            this.stopToPass();
            this.processNext();
        }
        else if(cmd == CtrlerCMD.TIMER_REACH_TRANSITION_TIME){
            this.tansitGreentoYellow();   
        }
        else if(cmd == CtrlerCMD.EMERGENCY){
            this.allowEmergency(emergencyIndex);
        }
    }
    stopToPass(){
        this.queueList[this.activeIndex].stopToPass();
        console.log("GOING TO STOP INDEX: ",this.activeIndex ," was Emergency ", this.emergency.wasEmergency);
       // let waitingTime = this.getWaitingTime(this.activeIndex,this.emergency.wasEmergency,index);
        //console.log("My waiting time is ", waitingTime);
        //this.emergency.wasEmergency = false;
        //this.emergency.index = null;
    }
    processNext(){     
        let totalCross = TrafficJunction.noOfCross - 1;
         if(this.activeIndex == totalCross ){
             this.activeIndex = -1;
             this.resetQueue();
         }
        this.activeIndex++;
        this.queueList[this.activeIndex].allowToPass(this.queueList[this.activeIndex].option.timerValue); 
    }
    tansitGreentoYellow(){
        this.crossList[this.activeIndex].notifyTimetoEnd();
    }
    allowEmergency(emergencyIndex){
        this.stopToPass();
        let activeIndex = this.activeIndex;
        if(emergencyIndex - activeIndex == 1)
            this.processNext();
        else{ 
            this.emergency.wasEmergency = true;
            this.emergency.index = emergencyIndex;
            this.queueList[emergencyIndex].allowToPass(this.queueList[emergencyIndex].option.timerValue);
            this.modifyQueue(this.queueList,emergencyIndex);    
            // notify to all crosses for incrementing the timer value 
        }
    }
    getWaitingTime(activeIndex,wasEmergency,emergencyIndex){
        let waitingTime = 0;
        let totalCross = TrafficJunction.noOfCross;
        let calculateNormal = () => {if(activeIndex != i) waitingTime += this.crossList[i].option.timerValue; }
        if(wasEmergency){
            for(let i=0; i<totalCross; i++){
                calculateNormal(); 
                if(emergencyIndex == i){
                    waitingTime += this.crossList[i].option.timerValue;
                }
            } 
        }
        else{
            for(let i=0; i<totalCross; i++){
                calculateNormal();              
            } 
        }       
        return waitingTime;
    }
    modifyQueue(queueList,modifiedIndex){
        this.activeIndex++;
        let activeIndex = this.activeIndex;
        console.log("modifiedIndex  ",modifiedIndex);
        console.log("activeIndex  ",activeIndex);
        if(activeIndex < modifiedIndex ){   // eg : activeindex & modifiedindex  like 0<3, 1<3 , 0<2
            let totalCross = TrafficJunction.noOfCross-1;
            let emergencyCross = queueList[modifiedIndex];            
            let _temp = null;
            let i,k;
            for( i = modifiedIndex  ; i > activeIndex; i--){
                k = i;
                k--;
                console.log("i = ",i,"K ",k)
                queueList[i] = queueList[k];                
            }
            console.log("lastly cueently i = ",i);
            queueList[i] = emergencyCross;
            
        } else {
            // 0,0  1,0  1,1  2,0  2,2  3,0  3,1  3,2  3,3
            console.log("DO NOTHING")
        }
        console.log(queueList);
        // 0,1  1,2  2,3
    }
    notify(){
        console.log("My duty is to notify others");
    }
    delay(callBack,timeInSec){
        setTimeout(function(){
            callBack && callBack();
        },timeInSec || 3000);
    }
}
/*   
        CROSS 
*/
class Cross extends Timer{
    option: {};
    incrementor: number = 1;
    private hasEmergency: boolean;
    constructor(option : ITraffic){ 
        super(10,0,3);
        this.option= option;        
    }    
    notifyTimetoEnd(){
        this.hideGreen();
        this.showYellow();        
    }
    allowToPass(timerValue){
        this.startCountDown(timerValue,function(){},true);
        this.showGreen();        
    }
    stopToPass(){
        this.stopCountDown();
        this.showRed();
    }
    showWaitingTime(timerValue){
        this.startCountDown(timerValue);
    }
    stopWaitingTime(){
        this.stopCountDown();
    }
    showGreen(timerValue){
        console.log("SHOW GREEN");
    }     
    hideGreen(){
       console.log("HIDE GREEN"); 
    }
    showYellow(){
        console.log("SHOW YELLOW");
    }
    hideYellow(){
        console.log("HIDE YELLOW");
    }
    showRed(){
        console.log("SHOW RED");
    }
    hideRed(){
        console.log("HIDE RED");
    }
    blinkYellow(timerValue){
        let _this = this;
        this.startCountDown(timerValue,function(){  
            _this.incrementor++ % 2 == 0 ? _this.hideYellow():_this.showYellow();
          });
    }
    stopBlinker(){
        this.stopToPass();
    }
}
/*   
        TRAFFIC JUNCTION 
*/    
class TrafficJunction{ 
    name: string; // is main cross ?? 
    static noOfCross: number = 0;
    crossList =[];
    constructor(name: string){ 
        this.name = name;
        this.init();
    }    
    init(){
        Fhosur = new Cross({
            from:"hosur",
            to:["majestic","koramangala","oracle"],
            timerValue:10,
            hasEmergency : false
        });
        this.incrementNoofCrosses();
        this.addtoCrossList(Fhosur);
        Fkoramangala = new Cross({
            from:"koramangala",
            to:["oracle","majestic","hosur",],
            timerValue:10,
            hasEmergency : false
        });
        this.incrementNoofCrosses();
        this.addtoCrossList(Fkoramangala);
        Fmajestic = new Cross({
            from:"majestic",
            to:["hosur","oracle","koramangala"],
            timerValue:10,
            hasEmergency : false
        });
        this.incrementNoofCrosses();
        this.addtoCrossList(Fmajestic);
        Foracle = new Cross({
            from:"oracle",
            to:["koramangala","hosur","majestic"],
            timerValue:10,
            hasEmergency : false
        });
        this.incrementNoofCrosses();
        this.addtoCrossList(Foracle);
        var _this = this;
        this.createRouteMap(function(){            
            controller = new TrafficContrller(); 
            window.crossList = _this.crossList;
            localStorage.setItem("crossList",JSON.stringify(crossList));
            controller.init(_this,_this.crossList);
        });
    }
    allowAllCrossToPass(timerValue){
        Fhosur.blinkYellow(timerValue);
        Fkoramangala.blinkYellow(timerValue);
        Fmajestic.blinkYellow(timerValue);
        Foracle.blinkYellow(timerValue);
    }
    stopAllCross(){
        Fhosur.stopBlinker();
        Fkoramangala.stopBlinker();
        Fmajestic.stopBlinker();
        Foracle.stopBlinker();
    }
    incrementNoofCrosses(){
        TrafficJunction.noOfCross++;
    }
    addtoCrossList(item){
        this.crossList.push(item);
    }
    getNoofCrosses (){
        return TrafficJunction.noOfCross;
    }
    getCrossList    (){
        return this.crossList;
    }
    createRouteMap(callBack):void{
        let totalCross = this.getNoofCrosses();       
        callBack && callBack();
    }
    observer(){
        
    }
}
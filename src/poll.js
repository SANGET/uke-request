/**
 * 轮询模块
 * 用法
 *
 * const pollEntity = new PollMethod(pollFreq); [pollFreq 为轮询一次的频率，单位为秒]
 * pollEntity.onRes = pollHandle;
 * pollEntity.setPollConfig({
 *   [pollItemName]: {
 *     freq: 1 [freq 轮询的频率，例如设置为 1，即基于上面的 2 秒一次的轮询每次都执行]
 *   },
 *   getData: function() {
 *     return {
 *
 *     }
 *   }
 * })
 *
 * 使用方法
 *
 * 定义回调函数
 * function pollHandle(res) {
 * const {resData, api, id} = res;
 *   switch(api || id) {
 *     case [id]:
 *       [handle]
 *   }
 * }
 *
 * 定义 config
 * let pollConfig = {
   ID: {
     freq: 1,
     callback: pollHandle,
     api: APIS.QUERY_USER_FOR_POLLING, // 必须的
     getData() {                       // 必须的
       return {
         Method: this.api,
         Data: {
           Count: 1
         }
       };
     }
   }
 };
 *
 * new 一个轮询对象
 * const PollingEntity = new PollMethod(freq = 2);
 *
 * 把 config 传给这个对象
 * PollingEntity.addConfig(pollConfig);
 * PollingEntity.removeConfig(ID);     ID 可以为 [id1, id2] 也可以为字符串 id
 *
 * 开始轮询
 * PollingEntity.start();
 *
 * 停止轮询
 * PollingEntity.stop()
 */

export default class PollMethod {
  constructor(pollFreq = 2, pollMethod = 'poll') {
    // super();

    this.pollFreq = pollFreq * 1000;
    this.pollTime = 0;
    this.pollData = {
      method: pollMethod,
      data: {
        Params: []
      }
    }
    this.pollUrl = '';
    this.timer = null;
    this.isStarted = false;

    this.callbackQueue = {};

    /**
     * 轮询数据, key 为数据的 ID, value 为轮询数据结构
     * this.pollDataSet = {
     *   [pollDataID]: {
     *     freq: number 该条数据的轮询次数频率, 轮询基础频率为 2 秒一次, 如果填写 10 , 即 10 次 2 秒的轮询以轮到该方法
     *     data: Object 该条数据的实际请求体 {
     *       Header: {},
     *       Data  : function 生成请求数据
     *     }
     *   }
     * }
     */
    this.pollDataSet = {};
  }
  start() {
    if(!this.isStarted && this.checkConfig()) {
      this.pollTime = 1;
      this.setTiming();
      this.isStarted = true;
    }
  }
  checkConfig() {
    let isPass = false;
    switch (true) {
      case !this.$request:
        console.log('please call setReqObj($request)');
        break;
      case !this.pollUrl:
        console.log('please call setPollUrl(pollUrl)');
        break;
      default:
        isPass = true;
    }
    return isPass;
  }
  setReqObj(reqObj) {
    this.$request = reqObj;
  }
  setPollUrl(url) {
    this.pollUrl = url;
  }
  setPollConfig(data) {
    if (typeof data != 'object') return console.error('this interface expect parameter of Object');
    this.pollDataSet = data;
  }
  addConfig(data) {
    Object.assign(this.pollDataSet, data);
  }
  removeConfig(key) {
    let keyArr = Array.isArray(key) ? key : [key];
    keyArr.forEach(item => delete this.pollDataSet[item]);
  }
  setTiming() {
    let self = this;
    this.timer = setTimeout(() => {
      self.setTiming();
    }, this.pollFreq);
    this.polling();
    this.pollTime += 1;
  }
  _wrapPollData() {
    let allPollConfig = [];
    let configIdConfigMapper = {};
    for (var configID in this.pollDataSet) {
      let currConfig = this.pollDataSet[configID];
      let currData = currConfig.getData();
      if (!!currData && (this.pollTime == 0 || this.pollTime % currConfig.freq == 0)) {
        allPollConfig.push(currData);
        configIdConfigMapper[currConfig.api] = Object.assign({}, currConfig, {id: configID});
      }
    }
    return {allPollConfig, configIdConfigMapper};
  }
  polling() {
    const self = this;
    const pollDataParams = this._wrapPollData(); // 获取轮询的参数
    const {allPollConfig, configIdConfigMapper} = pollDataParams;
    if (allPollConfig.length == 0) return; // 如果没有参数, 就不发起请求轮询
    let _pollData = Object.assign({}, this.pollData, {
      data: {
        Params: allPollConfig
      }
    });
    this.$request.gameGate(_pollData, (res) => {
      let data = res.data;
      for (var dataKey in data) {
        let configMapped = configIdConfigMapper[dataKey];
        if(configMapped && configMapped.callback && typeof configMapped.callback == 'function') {
          configMapped.callback({
            resData: data[dataKey],
            api: dataKey,
            id: configMapped.id,
            config: configMapped
          });
        }
      }
    }, null, this.pollUrl);
  }
  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.isStarted = false;
  }
}

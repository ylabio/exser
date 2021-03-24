class CalculateProperty {

  constructor({calculate = () => {}}) {
    this.calculate = calculate;
    this.isCalculate = false;
    this.value = undefined;
  }

  valueOf(){
    return this.exeCalculate();
  }

  toJSON(){
    return this.exeCalculate();
  }

  toBSON(){
    return this.exeCalculate();
  }

  async exeCalculate(){
    if (!this.isCalculate){
      this.isCalculate = true;
      this.value = await this.calculate();
    }
    return this.isCalculate
  }
}

module.exports = CalculateProperty

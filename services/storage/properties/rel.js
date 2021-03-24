class RelProperty {

  constructor({value, options}) {
    this.setOptions(options);
    this.setValue(value);
  }

  setValue(value){
    this.value = value;
  }

  setOptions(options){
    this.options = options;
  }

  valueOf(){
    return this.value;
  }

  toJSON(){
    return this.value;
  }

  toBSON(){
    return this.value;
  }

  onPrepare({storage, session, object}){

  }

  onSave(){

  }

  onView(){

  }
}

module.exports = RelProperty;

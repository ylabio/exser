class I18nProperty {

  constructor(value, options) {
    this.value = value;
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

module.exports = {construct: I18nProperty, emptyStringToNull: false, canCreateWithNull: true};

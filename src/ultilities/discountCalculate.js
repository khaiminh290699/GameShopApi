const discountCalculate = (price, discount, current) => {
  switch(current) {
    case 0 : {
      return price;
    }
    case 1: {
      return price - (price * discount);
    }
    case 2: {
      return price - discount;
    }
  }
}
module.exports = discountCalculate;
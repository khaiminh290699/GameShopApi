const executeParallel = async (array, amount, each) => {
  if (amount === 0) {
    return;
  }
  let from = 0;
  let to = from + amount;
  while(true) {
    const sub = array.slice(from, to);
    if (sub.length === 0) {
      return;
    }
    await Promise.all(sub.map(async (data) => {
      await each(data);
    }))
    from = to;
    to = from + amount;
  }
}

const executeEach = async (array, each, index = 0) => {
  if (index >= array.length) {
    return;
  }
  await each(array[index]);
  await executeEach(array, each, index + 1);
}

module.exports.executeParallel = executeParallel;
module.exports.executeEach = executeEach;

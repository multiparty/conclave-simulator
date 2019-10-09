const cc = simulator.cc;
const utils = simulator.utils;
const ver = simulator.Verifier;

function demo() {
  var workflow = new Function($('#workflow').text());

  let policyOne = JSON.parse($('#policyOne').text());
  let vOne = new ver.Verify(workflow(), policyOne);
  let resOne = vOne.verify();

  let policyTwo = JSON.parse($('#policyTwo').text());
  let vTwo = new ver.Verify(workflow(), policyTwo);
  let resTwo = vTwo.verify();

  var output = '';
  if (resOne === true && resTwo === false) {
    output = 'Verification Passed.';
  } else {
    output = 'Verification Failed.';
  }
  $('#out').text(output);// + '\n\n' + workflow());

  console.log(output, workflow());
  return [resOne, resTwo, output, policyOne, policyTwo, workflow, workflow()];
}

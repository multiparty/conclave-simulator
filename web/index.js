const cc = simulator.cc;
const utils = simulator.utils;
const ver = simulator.Verifier;

function demo() {
  try {
    let workflow = new Function($('#workflow').val());

    let policyOne = JSON.parse($('#policyOne').val());
    let vOne = new ver.Verify(workflow(), policyOne);
    let resOne = vOne.verify();

    let policyTwo = JSON.parse($('#policyTwo').val());
    let vTwo = new ver.Verify(workflow(), policyTwo);
    let resTwo = vTwo.verify();

    if (resOne === true && resTwo === false) {
      output = 'Verification Passed.';
    } else {
      output = 'Verification Failed.';
    }
    $('#out').text(output);// + '\n\n' + workflow());

    console.log(output, workflow());
    return [resOne, resTwo, output, policyOne, policyTwo, workflow, workflow()];
  } catch (e) {
    $('#out').text(e);
    throw e;
    return 'Syntax Error: ' + e;
  }
}

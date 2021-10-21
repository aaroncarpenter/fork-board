// ***********************
// Name: Utils	
// Purpose: 
// ************************
class Utils {
   // ***********************
   // Name: 	showErrorMessage
   // Purpose: 
   //    Args: logger - 
   //          message - 
   //          timeout - 
   //  Return: N/A
   // ************************
   showErrorMessage(logger, message, timeout) {
      logger.error(message);

      $('#alertBox').text(message);
      $('#alertBox').show();
      setTimeout(
         function () {
            $('#alertBox').hide();
         }, timeout
      );
   }

   // ***********************
   // Name: 	getAdjustedBalanceLabel
   // Purpose: 
   //    Args: balance - wallet balance value
   //  Return: Formatted balance string
   // ************************
   getAdjustedBalanceLabel(balance) {
      let balanceStr = "";

      if (balance > 1000) {
         balance = Math.round(balance);
      }

      if (balance < 100000) {
         balanceStr = balance.toLocaleString();
      } else if (balance < 1000000) {
         balanceStr = (balance / 1000).toLocaleString() + "K";
      } else if (balance < 1000000000) {
         balanceStr = (balance / 1000000).toLocaleString() + "M";
      } else {
         balanceStr = (balance / 1000000000).toLocaleString() + "B";
      }

      return balanceStr;
   }

   // ***********************
   // Name: 	getAdjustedUSDBalanceLabel
   // Purpose: 
   //    Args: balance - wallet balance value
   //  Return: Formatted balance string
   // ************************
   getAdjustedUSDBalanceLabel(balance) {
      let balanceStr = "";

      balanceStr = balance.toLocaleString('en-US', {
         style: 'currency',
         currency: 'USD'
      });

      return balanceStr;
   }
}

module.exports = Utils;
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

      // Round balance to whoel number if higher than 10000.
      if (balance > 10000) {
         balance = Math.round(balance);
      }

      balanceStr = balance.toLocaleString('en-US', {style: 'currency', currency: 'USD'});

      // Strip the ending decimals if over 10000 since it was rounded above.
      if (balance >= 10000) {
         balanceStr = balanceStr.replace('.00','');
      }

      return balanceStr;
   }

  applySort(key, order = 'asc') {
      return function innerSort(a, b) {
        if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
          // property doesn't exist on either object
          return 0;
        }
    
        const varA = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
        const varB = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];
    
        let comparison = 0;
        if (varA > varB) {
          comparison = 1;
        } else if (varA < varB) {
          comparison = -1;
        }
        return (
          (order === 'desc') ? (comparison * -1) : comparison
        );
      };
    }
}

module.exports = Utils;
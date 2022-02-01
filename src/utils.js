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
   showErrorMessage(logger, message, instructions, timeout=null) {
      logger.error(message);

      $('#errorAlertMessage').text(message);
      $('#errorAlertInstructions').text(instructions);
      $('#errorAlertBox').show();

      if (timeout != null) {
         setTimeout(
            function () {
               $('#errorAlertBox').hide();
            }, timeout
         );
      }
   }

   // ***********************
   // Name: 	showWarnMessage
   // Purpose: 
   //    Args: logger - 
   //          message - 
   //          timeout - 
   //  Return: N/A
   // ************************
   showWarnMessage(logger, message, timeout) {
      logger.error(message);

      $('#warnAlertBox').text(message);
      $('#warnAlertBox').show();
      setTimeout(
         function () {
            $('#warnAlertBox').hide();
         }, timeout
      );
   }

   // ***********************
   // Name: 	showInfoMessage
   // Purpose: 
   //    Args: logger - 
   //          message - 
   //          timeout - 
   //  Return: N/A
   // ************************
   showInfoMessage(logger, message, timeout) {
      logger.info(message);

      $('#infoAlertBox').text(message);
      $('#infoAlertBox').show();
      setTimeout(
         function () {
            $('#infoAlertBox').hide();
            $('#infoAlertBox').text(null);
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

      if (balance < 1000 && balance >= 1) {
         balance = Math.round(balance*100)/100;
      }
      else if (balance < 1) {
         balance = Math.round(balance*1000)/1000;
      }
      else {
         balance = Math.round(balance);
      }

      if (balance < 100000) {
         balanceStr = balance.toLocaleString();
      } else if (balance < 1000000) {
         balanceStr = (balance / 1000).toLocaleString() + "K";
      } else if (balance < 1000000000) {
         balanceStr = (Math.round((balance / 1000000) * 10) / 10).toLocaleString() + "M";
      } else {
         balanceStr = (Math.round((balance / 1000000000) * 10) / 10).toLocaleString() + "B";
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

   // ***********************
   // Name: 	getAdjustedUSDBalanceLabel
   // Purpose: 
   //    Args: balance - wallet balance value
   //  Return: Formatted balance string
   // ************************
   getAdjustedCurrencyBalanceLabel(balance, currencyStr, exchangeRates) {
      let balanceStr = "";

      let exchangeRate = this.getUSDExchangeRate(currencyStr, exchangeRates);

      balance = balance * exchangeRate;

      // Round balance to whole number if higher than 10000.
      if (balance > 10000) {
         balance = Math.round(balance);
      }

      balanceStr = balance.toLocaleString(navigator.languages[0], {style: 'currency', currency: currencyStr});

      // Strip the ending decimals if over 10000 since it was rounded above.
      if (balance >= 10000) {
         balanceStr = balanceStr.replace('.00','');
      }

      return balanceStr;
   }

   // ***********************
   // Name: 	getUSDExchangeRate
   // Purpose: 
   //    Args: currency - currency to convert
   //          exchangeRateObj - currency to convert
   //  Return: exchange rate to USD
   // ************************
   getUSDExchangeRate(currency, exchangeRates) {
      let exchangeRate = 1.0;

      if (Object.keys(exchangeRates).length != 0 && (currency == 'GBP' || currency == 'EUR' || currency == 'RUB' || currency == 'CNY'))
      {
         exchangeRate = exchangeRates[currency];
      }

      return exchangeRate;
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
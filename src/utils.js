// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
class Utils {

   // ***********************
   // Name: 	
   // Purpose: 
   //    Args: 
   //  Return: 
   // *************************
   showErrorMessage(logger, message, timeout)
   {
      logger.error(message);
      
      $('#alertBox').text(message);
      $('#alertBox').show();
      setTimeout(
         function() {
            $('#alertBox').hide();
         }, timeout
      );
   }

   // ***********************
   // Name: 	
   // Purpose: 
   //    Args: 
   //  Return: 
   // *************************
   convertFromMojo(mojoValue)
   {
      return mojoValue/1000000000000;
   } 

   // ***********************
   // Name: 	
   // Purpose: 
   //    Args: 
   //  Return: 
   // *************************
   getAdjustedBalanceLabel(balance)
   {
      let balanceStr = "";

      if (balance > 1000)
         balance = Math.round(balance);

      if (balance < 100000)
         balanceStr = balance.toLocaleString();
      else if (balance < 1000000)
         balanceStr = (balance/1000).toLocaleString() + "K";
      else if (balance < 1000000000)
         balanceStr = (balance/1000000).toLocaleString() + "M";
      else
         balanceStr = (balance/1000000000).toLocaleString() + "B";
      
      return balanceStr;
   } 
 }
 
 module.exports = Utils;
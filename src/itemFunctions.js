// Q.all([
// 	this.queryForCost(data.item_id),
// 	//queryForPoints()
// 	]).then(function(results) {
// 		// costResult will be the first row returned from the cost
// 		var costResult = common.checkValue(results[0][0][0])  // last [0] for 1st row only. Gives array even if only 1 row returned


// 		// results[function - by order of array under all][all rows][ith returned row]
// 		var cost = null;

// 		if (costResult != null) {
// 			cost = costResult.cost;
// 		}
		
// 	});


// 	queryForCost: function(id) {
// 		var defered = Q.defer();
// 		common.connection.query(...., defered.makeNodeResolver());
// 		return defered.promise;
// 	}



// function a() {
// 	function b() {
// 		function c() {

// 		}
// 	}
// }

// ==

// Q.all([
// 	a(),
// 	b(),
// 	c()
// ]).then(function(results) {

// });





var common = require("./common.js")();
var user   = require("./userFunctions");
var Q      = require("q");
module.exports = {
	viewall: function(data, isHttp, socket)
	{
		if(common.checkValue(data.id) == null)
		{
			common.returnJsonResponse(isHttp, socket, {
				success: false, 
				message: "'data.id' is required for the vending machine ID"
			}, common.HttpCode.OK);
			return;
		}

		var query = "SELECT i.id, i.name, i.cost, i.calories, i.sugars, i.carbs, i.saturated_fat, i.trans_fat, i.protein, i.sodium, i.servings, m.stock";
			query += " FROM item AS i, item_vending_machine AS m";
			query += " WHERE m.vending_machine_id ='" + data.id + "'" + " AND i.id = m.item_id";
		common.connection.query(query, function(err, result){
			if(err)
			{
				console.error("Mysql Error");
				console.error(err);
				common.returnJsonResponse(isHttp, socket, {
					success: false,
					message: "Error occured: " + err
				}, common.HttpCode.OK);
			}
			else
			{
				console.log(result);
				if(common.checkValue(result[0]) == null)
				{
					common.returnJsonResponse(isHttp, socket, {
						success: false,
						message: "Vending machine with id '"+data.id+"' does not exist."
					}, common.HttpCode.OK);	
				}
				else
				{
					common.returnJsonResponse(isHttp, socket, {
						success: true,
						data: result
					}, common.HttpCode.OK);
				}
			}
		});

	},

	purchase: function(data, isHttp, socket) 
	{
		var user_id = null;

		if (common.checkValue(data.user_id) != null) {
			user_id = data.user_id;
		} else if (common.checkValue(data.fitbit_id) != null) {
			user_id = data.fitbit_id;
		}

		if (common.checkValue(data.item_id) == null || 
			common.checkValue(data.vending_machine_id) == null ||
			user_id == null)
		{
			common.returnJsonResponse(isHttp, socket, {
				success: false,
				message: "'data.item_id', 'data.vending_machine_id', and ('data.fitbit_id' OR 'data.user_id') are required to make a purchase"
			}, common.HttpCode.OK);
			return;
		} 

		// Check to ensure user has enough balance to make purchase
		// Get the cost of desired item
		// Check to make sure item is in stock in desired vending machine
			// Vend
				// Update stock count
				// Update user steps taken today
		getUserInfo(user_id)
		.then (function(results) {
			console.log(results);
		}, function(error) {
			console.log(error);
		});

		Q.allSettled([
			getUserInfo(user_id),
			getItemCost(data.item_id),
			getVendingItemInfo(data.vending_machine_id, data.item_id)
		]).then(function (results) {
			results.forEach(function (result) {
				if (result.state === "fulfilled") {
					console.log("\n\n----------------------------------------\nFulfilled:\n" + JSON.stringify(result.value) + "\n----------------------------------------");
				} else {
					console.log("\n\n----------------------------------------\nRejected reason: " + result.reason + "\n----------------------------------------");
				}
			});

			// results[0] contains {access_token, current_balance} at results[0][0]
			// results[1] contains {cost} at results[1][0][0]
			// results[2] contains {id, item_id, vending_machine_id, stock} at results[2][0][0]

			var userInfo = results[0].value;
			var itemInfo = results[1].value[0][0];
			var vendingItemInfo = results[2].value[0][0];

			// Now we have all of the info to perform the below...

			// Check if user has enough balance to make purchase
			if (userInfo.current_balance < itemInfo.cost) {
				console.log("Not enough points");
				common.returnJsonResponse(isHttp, socket, {
					success: false,
					message: "Not enough points for purchase. User has " + userInfo.current_balance + " points and needs " + itemInfo.cost + " points for purchase"
				}, common.HttpCode.OK);
				return;
			}

			// Check to make sure item is in stock in desired vending machine
			if (vendingItemInfo.stock < 1) {
				common.returnJsonResponse(isHttp, socket, {
					success: false,
					message: "Item id '" + data.item_id + "' is out of stock in vending machine '" + data.vending_machine_id + "'"
				}, common.HttpCode.OK);
				return;
			}

			// TODO //
			// Vend
				// Update stock count
				// Update user steps taken today



		});

		function getUserInfo(user_id) {
			var deferred = Q.defer();
			user.viewbasic({id: user_id}, null, null, deferred.makeNodeResolver());
			return deferred.promise;
		}

		function getItemCost(item_id) {
			var deferred = Q.defer();
			common.connection.query("SELECT cost from item where id = '" + item_id + "'", deferred.makeNodeResolver());
			return deferred.promise;
		}

		function getVendingItemInfo(vending_machine_id, item_id) {
			var deferred = Q.defer();
			var query = "SELECT id, item_id, vending_machine_id, stock FROM item_vending_machine WHERE vending_machine_id = '" + data.vending_machine_id + "' AND item_id = '" + data.item_id + "'";
			common.connection.query(query, deferred.makeNodeResolver());
			return deferred.promise;
		}



		// // First, check to ensure the user has enough balance to make the purchase
		// var userInfo = user.viewbasic({id: user_id});
		// if (userInfo == null) {
		// 	common.returnJsonResponse(isHttp, socket, {
		// 		success: false,
		// 		message: "User with id '" + user_id + "' not found"
		// 	}, common.HttpCode.OK);
		// }

		// var itemCost = 0;

		// // Get the cost of the item
		// common.connection.query("SELECT cost from item where id = '" + data.item_id + "'", function(err, result) {
		// 	if (err)
		// 	{
		// 		common.returnJsonResponse(isHttp, socket, {
		// 			success: false,
		// 			message: "Error occured: " + err
		// 		}, common.HttpCode.OK);
		// 		return;
		// 	}
		// 	else if (common.checkValue(result) == null)
		// 	{
		// 		common.returnJsonResponse(isHttp, socket, {
		// 			success: false,
		// 			message: "Item with id '" + data.item_id + "' does not exist"
		// 		}, common.HttpCode.OK);
		// 		return;
		// 	}

		// 	itemCost = result.cost;
		// });

		// if (userInfo.current_balance < itemCost) {
		// 	common.returnJsonResponse(isHttp, socket, {
		// 		success: false,
		// 		message: "Not enough points for purchase. User has " + userInfo.current_balance + " points and needs " + itemCost + " points for purchase"
		// 	}, common.HttpCode.OK);
		// 	return;
		// } 

		// // If the user has enough points, check to ensure the item is in stock in the desired vending machine
		// var query = "SELECT id, item_id, vending_machine_id, stock FROM item_vending_machine WHERE vending_machine_id = '" + data.vending_machine_id + "' AND item_id = '" + data.item_id + "'";
		// common.connection.query(query, function(err, result) {
		// 	if(err)
		// 	{
		// 		console.error("Mysql Error");
		// 		console.error(err);
		// 		common.returnJsonResponse(isHttp, socket, {
		// 			success: false,
		// 			message: "Error occured: " + err
		// 		}, common.HttpCode.OK);
		// 		return;
		// 	}
		// 	else if (common.checkValue(result) == null)
		// 	{
		// 		common.returnJsonResponse(isHttp, socket, {
		// 			success: false,
		// 			message: "Item with id '" + data.item_id + "' does not exist in vending machine '" + data.vending_machine_id + "'"
		// 		}, common.HttpCode.OK);
		// 		return;
		// 	}

		// 	console.log(result);

		// 	if (result.stock < 1) {
		// 		common.returnJsonResponse(isHttp, socket, {
		// 			success: false,
		// 			message: "Item id '" + data.item_id + "' is out of stock in vending machine '" + data.vending_machine_id + "'"
		// 		}, common.HttpCode.OK);
		// 		return;
		// 	}

		// 	// TODO - Send request to the desired id to vend the particular item id
		// 	// Perform below if successful vend

		// 	// Update stock count
		// 	this.updateItemVendingMachine({
		// 		id: data.id,
		// 		stock: result.stock - 1
		// 	});

		// 	// Update user step count
		// 	user.update({
		// 		id: userInfo.id,
		// 		steps_spent_today: userInfo.steps_spent_today + itemCost

		// 	}, isHttp, socket);

		// });
	},

	updateItemVendingMachine: function(data, isHttp, socket) {
		if(common.checkValue(data.id) == null)
		{
			if (socket == null) {
				return;
			}
			common.returnJsonResponse(isHttp, socket, {
				success: false,
				message: "'data.id' is required"
			}, common.HttpCode.OK);
		}
		else
		{
			var id = data.id;
			delete data.id;
			var query = "UPDATE vendfit.item_vending_machine SET ? WHERE id='"+id+"'";

			common.connection.query(query, data, function(err, result){
				if(err)
				{
					console.error("Mysql Error");
					console.error(err);

					if (socket == null) {
						return;
					}

					common.returnJsonResponse(isHttp, socket, {
						success: false,
						message: "An unkown error occured"
					}, common.HttpCode.OK);
				}
				else
				{
					console.log(result);

					if (socket == null) {
						return;
					}

					common.returnJsonResponse(isHttp, socket, {
						success: true,
					}, common.HttpCode.OK);
				}
			});
		}
	}

}
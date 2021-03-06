var common = require("./common.js")();
var Q      = require("q");

module.exports = {
	viewbasic: function(data, socket, callback)
	{
		console.log("3");
		if(common.checkValue(data.id) == null)
		{

			var err = "'data.id' is required";

			if (callback) {
				callback(err, null);
				return;
			}

			common.returnJsonResponse(socket, {
				success: false,
				message: err
			}, common.HttpCode.OK);
		}else{
			var query = "SELECT access_token, total_steps - steps_spent_today as current_balance";
				query += " FROM vendfit.user";
				query += " WHERE fitbit_id='" + data.id + "'";

			if (typeof(data.id) == 'number') {
				query += "OR id='" + id +"'";
			} 

			if (callback) {
				common.connection.query(query, callback);
				return;
			}

			common.connection.query(query, function(err, result){
				if(err)
				{
					console.error("Mysql Error");
					console.error(err);

					common.returnJsonResponse(socket, {
						success: false,
						message: "An Unkown error occured"
					}, common.HttpCode.OK);
				}else
				{
					common.returnJsonResponse(socket, {
						success: true,
						data: result[0]
					}, common.HttpCode.OK);
				}
			});
		}
	},

	viewall: function(data, socket, callback)
	{
		console.log(callback);
		if(common.checkValue(data.id) == null)
		{
			var err = "'data.id' is required";

			if (callback) {
				callback(err, null);
				return;
			}

			common.returnJsonResponse(socket, {
				success: false, 
				message: err
			}, common.HttpCode.OK);
		}else{
			var query = "SELECT id, access_token, fitbit_id, total_steps, steps_spent_today, total_steps - steps_spent_today as current_balance, date_updated";
				query += " FROM vendfit.user";
				query += " WHERE fitbit_id='" + data.id + "'";

			if (typeof(data.id) == 'number') {
				query += "OR id='" + data.id +"'";
			} 

			if (callback) {
				console.log("callback query");
				common.connection.query(query, callback);
				return;
			}

			console.log("non callback query");

			common.connection.query(query, function(err, result){
				if(err)
				{
					console.error("Mysql Error");
					console.error(err);
					common.returnJsonResponse(socket, {
						success: false,
						message: "An Unkown error occured"
					}, common.HttpCode.OK);
				}else
				{
					console.log("YOU BETTER FUCKING BE A 7");
					console.log(result);
					if(common.checkValue(result[0]) == null)
					{
						common.returnJsonResponse(socket, {
							success: false,
							message: "User with id '"+data.id+"' does not exist."
						}, common.HttpCode.OK);	
					}else
					{
						common.returnJsonResponse(socket, {
							success: true,
							data: result[0]
						}, common.HttpCode.OK);
					}
				}
			});
		}
	},

	create: function(data, socket)
	{
		if(common.checkValue(data.fitbit_id) == null)
		{
			common.returnJsonResponse(socket, {
				success: false, 
				message: "'data.fitbit_id' is required"
			}, common.HttpCode.OK);
		}else if(common.checkValue(data.access_token) == null)
		{
			common.returnJsonResponse(socket, {
				success: false, 
				message: "'data.access_token' is required"
			}, common.HttpCode.OK);
		} else {

			if (common.checkValue(data.date_updated) == null) {
				data.date_updated = common.getDate(data.id);
			}
			data.total_steps = common.checkValue(data.total_steps, 0);
			data.steps_spent_today = common.checkValue(data.steps_spent_today, 0);
			var query = "INSERT INTO vendfit.user SET ?";
			common.connection.query(query, data, function(err, result){
				if(err)
				{
					console.error("Mysql Error");
					console.error(err);
					if(err.errno == 1062)
					{
						common.returnJsonResponse(socket, {
							success: false,
							message: "User with fitbit_id '"+data.fitbit_id+"' already exists."
						}, common.HttpCode.OK);
					}else{
						common.returnJsonResponse(socket, {
							success: false,
							message: "An unkown error occured"
						}, common.HttpCode.OK);
					}
					
				}else
				{
					console.log(result);
					common.returnJsonResponse(socket, {
						success: true,
						data: {
							created_id: result.insertId
						}
					}, common.HttpCode.OK);
				}
			});
		}
	},

	update: function(data, socket, callback)
	{
		if(common.checkValue(data.id) == null)
		{
			var err = "'data.id' is required";

			if (callback) {
				callback(err, null);
				return;
			}

			common.returnJsonResponse(socket, {
				success: false, 
				message: err
			}, common.HttpCode.OK);
		}else{

			var id = data.id;

			// Create a copy of the data object since we need to delete the id
			var data2 = JSON.parse(JSON.stringify(data));
			delete data2.id;

			// Get the last date the step count was updated
			// Now update the user
			if (typeof(id) == 'number') {
				var query = "SELECT date_updated FROM user WHERE id="+id+" OR fitbit_id='" + id + "'";
			} else {
				var query = "SELECT date_updated FROM user WHERE fitbit_id='" + id + "'";
			}
			common.connection.query(query, (function(err, result) {
				if(err)
				{
					console.error("Mysql Error");
					console.error(err);
					common.returnJsonResponse(socket, {
						success: false,
						message: "An unkown error occured"
					}, common.HttpCode.OK);
				}else
				{
					// if the last date the step count was updated is not today, set step balance to zero
					//console.log("result: " + result);
					console.log(result);
					var lastUpdated = common.checkValue(result[0].date_updated);
					if (lastUpdated == null) {
						lastUpdated = common.getDate(data.id);
					}
					lastUpdated = Date.parse(lastUpdated);

					if (common.checkValue(data2.date_updated == null)) {
						data2.date_updated = common.getDate(data.id);
					}

					var newDate = Date.parse(data2.date_updated); 
					
					console.log("Date received: " + newDate + ", last updated date on server: " + lastUpdated);
					
					if (lastUpdated > newDate || lastUpdated < newDate) {
						console.log("Reseting balance");
						data2.steps_spent_today = 0;
					}


					// Now update the user
					if (typeof(id) == 'number') {
						var query = "UPDATE vendfit.user SET ? WHERE id="+id+" OR fitbit_id='"+id+"'";
					} else {
						var query = "UPDATE vendfit.user SET ? WHERE fitbit_id='"+id+"'";
					}

					if(common.checkValue(data2.date_updated) == null)
					{
						data2.date_updated = common.getDate(data.id);
					}					

					if (callback) {
						common.connection.query(query, data2, callback);
						return;
					}

					common.connection.query(query, data2, (function(err, result){
						if(err)
						{
							console.error("Mysql Error");
							console.error(err);
							common.returnJsonResponse(socket, {
								success: false,
								message: "An unkown error occured"
							}, common.HttpCode.OK);
						}else
						{
							console.log(result);
							this.viewall(data, socket, null);  // Send the original data object (with the ID) to the viewall() function
						}
					}).bind(this));
				}
			}).bind(this));

		}
	}

}

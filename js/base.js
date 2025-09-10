//verhindere document.ready bis die ID´s aus der URL gelesen wurden
$.holdReady(true);

var saved_url = $(location).attr('href'); //lese url ein
// Season ID
if(saved_url.toLowerCase().search(/se([0-9]+)/) == -1) { //wenn url keine season enthält dann setze default id
	var season_id = season_preset;
}
else { //wenn url eine season_id enthält
	var temp_season_id = (/se([0-9]+)/).exec(saved_url)[1];
	var season_id = temp_season_id;
}
//Competition ID
if(saved_url.toLowerCase().search(/co([0-9]+)/) == -1) { //wenn url keine season enthält dann setze default id
	var competition_id = 12;
}
else { //wenn url eine co_id enthält
	var temp_competition_id = (/co([0-9]+)/).exec(saved_url)[1];
	var competition_id = temp_competition_id;
}

// locale durchschleusen
if(saved_url.toLowerCase().search(/\/([a-z][a-z])\//) == -1) {
	var locale = 'de';
}
else {
	var temp_locale = (/\/([a-z][a-z])\//).exec(saved_url)[1];
	var locale = temp_locale;
}

$.holdReady(false); //erlaube document.ready

jQuery(document).ready(function() 
{
	var points_per_win		= 3;
	var points_per_draw 	= 1;
	var cdn_base 			= "https://nuevasnarrativasec.github.io/calculadora-eliminatorias-2026/equipos/";
	var teams 				= new Array();
	var matchdays_by_group 	= new Array();
	var current_round_id	= 0;
	var matchdays 			= 0;
	var is_tournament		= false;
	var cur_matchday 		= matchday_preset;
	var temp_round_id 		= 0;
	var ko_title = new Object();
	ko_title['de'] = 'KO-Runde';
	ko_title['en'] = 'K.O. phase';
	ko_title['it'] = 'Diretta';
	ko_title['nl'] = 'Finales';
	ko_title['es'] = 'Fase final';

	//Loading Image einblenden
	$('#wfb-tabcalc-content').hide();
	$('.wfb-tabcalc-wrapper').append('<div class="wfb-loading_img"></div>');

	$.getJSON('https://nuevasnarrativasec.github.io/calculadora-eliminatorias-2026/data/data-nuevo.json?v58', function(data) {
	//matches chronologisch sortieren
	//console.log("DATA: ", data);
		

		//Loading Image ausblenden
		$('.wfb-loading_img').remove();
		$('#wfb-tabcalc-content').show();

		//	Bool fuer Fallunterscheidung zwischen Liga und Turnier
		is_tournament = (data.matches[0].match[0].group_matchday > 0);

		//Gruppenwettbewerbe die falsch nicht als solche gesetzt sind trotzdem als Gruppe handhaben
		if(data.matches[0].match[0].group_matchday == 0 && data.matches[0].match[0].matchday == 0)
			is_tournament = true;
		
		if(!is_tournament)
		{
			data.matches[0].match.sort(function(a,b) {
                        var mid = a.matchday - b.matchday;
                        if(mid != 0)
                        	return mid;
                  
						var a_date = new Date(a.match_date.split(".")[2], a.match_date.split(".")[1]-1, a.match_date.split(".")[0], a.match_time.split(":")[0], a.match_time.split(":")[1]);
                        var b_date = new Date(b.match_date.split(".")[2], b.match_date.split(".")[1]-1, b.match_date.split(".")[0], b.match_time.split(":")[0], b.match_time.split(":")[1]);
                        return a_date - b_date;
            });
		}
		if(is_tournament)
		{
			data.matches[0].match.sort(function(a,b) {
			
                        var rid = a.round.id - b.round.id;
                        if(rid != 0)
                            return rid;
                        
                        var a_date = new Date(a.match_date.split(".")[2], a.match_date.split(".")[1]-1, a.match_date.split(".")[0], a.match_time.split(":")[0], a.match_time.split(":")[1]);
                        var b_date = new Date(b.match_date.split(".")[2], b.match_date.split(".")[1]-1, b.match_date.split(".")[0], b.match_time.split(":")[0], b.match_time.split(":")[1]);
                        return a_date - b_date;

                        var m_id = a.id - b.id;
                        if(m_id != 0)
                        	return m_id;
                });
		}
		// Gruppen Array anlegen
		if(is_tournament) {
			var groups_arr = new Array();
			var groups = groups_arr.length;
			// Gruppen starten bei A, daher initial prev-button ausblenden
			$("#wfb-tabcalc-prev-matchday").addClass("completed");
		}

		// Daten in Spieltage aufsplitten
		var current_matchday 	= matchday_preset;
		var html_string			= "";

		var min_matchday_date 	= new Date(2099, 12, 12);
		var max_matchday_date 	= new Date(0);
		var matchday_date 		= null;
		var matchday_strings 	= new Array();
		var group_matchday_strings = new Array();
		var teams_by_group = {};

		// Variablen zum löschen der doppelten round_marker
		data.rm_stripped		= new Array();
		var rm_full 			= data.standings[0].round_marker;
		var rm_buffer 			= {};

		if(rm_full != undefined)
		{
			for(var b = 0; b < rm_full.length; b++)
			{
				if(typeof(rm_buffer[rm_full[b].colour_id]) == 'undefined')
				{
					rm_buffer[rm_full[b].colour_id] = true;
					data.rm_stripped.push(rm_full[b]);
				}
			}
		}
		var tmp_counter = -1; // benötigen wir, um die Gruppen durchzunummerieren

		for (var i = 0; i < data.matches[0].match.length; i++)
		{
			// Sobald ein neuer Matchday erreicht wird, wird die alte Tabelle gepusht und eine neue Tabelle angelegt
			if(!is_tournament)
			{
				//if matchday increases or on first data-set (first match)
				if(data.matches[0].match[i].matchday != current_matchday || i == 0) {
					current_matchday = data.matches[0].match[i].matchday;
					if(html_string != "")
					{
						html_string += "</table>";
						$("#wfb-tabcalc-matchdays").append(html_string);
					}
					html_string = "<table class='wfb-tabcalc-matchday standard_tabelle' cellpadding='3' cellspacing='1' id='wfb-tabcalc-matchday-" + data.matches[0].match[i].matchday + "'><thead></thead><tbody>";

					min_matchday_date 	= new Date(2099, 12, 12);
					max_matchday_date 	= new Date(0);
				}
			}
			else if (is_tournament) //bei Gruppe
			{
				if (matchdays_by_group[data.matches[0].match[i].round.id] == null)
					matchdays_by_group[data.matches[0].match[i].round.id] = new Array();
				matchdays_by_group[data.matches[0].match[i].round.id].push(data.matches[0].match[i]);
				if (data.matches[0].match[i].round.id != current_round_id)
				{
					tmp_counter++;
					var group_obj = new Array();
					group_obj["round_id"] = data.matches[0].match[i].round.id;
					group_obj["round_order"] = data.matches[0].match[i].round.round_order;
					group_obj["has_table"] = Boolean(data.matches[0].match[i].round.table_mode);
					groups_arr[data.matches[0].match[i].round.name] = group_obj;
					current_round_id = data.matches[0].match[i].round.id;
					if (html_string != "")
					{
						html_string += "</table>";
						$("#wfb-tabcalc-matchdays").append(html_string);
					}
					html_string = "<table class='wfb-tabcalc-group standard_tabelle' cellpadding='3' cellspacing='1' data-group-order='" + tmp_counter + "' id='wfb-tabcalc-group-" + data.matches[0].match[i].round.id + "'><thead></thead><tbody>";

					min_matchday_date 	= new Date(2099, 12, 12);
					max_matchday_date 	= new Date(0);
				}
			}

			// Max- und Min-Datum abspeichern
			md = data.matches[0].match[i].match_date;
			c_md = new Date(md.split(".")[2], md.split(".")[1] - 1, md.split(".")[0]);
			if(c_md < min_matchday_date)
				min_matchday_date = c_md;
			if(c_md > max_matchday_date)
				max_matchday_date = c_md;

			// teams Array füllen
			if (true) {
				if (teams_by_group[data.matches[0].match[i].round.id] === null || teams_by_group[data.matches[0].match[i].round.id] === undefined) {
                    teams_by_group[data.matches[0].match[i].round.id] = new Array();
                }

				var t1 = newTeam();
				var t2 = newTeam();

				t1.name = data.matches[0].match[i].home.name;
				t2.name = data.matches[0].match[i].away.name;
				t1.id = data.matches[0].match[i].home.id;
				t2.id = data.matches[0].match[i].away.id;

				team1_exists = false;
				team2_exists = false;
				for(var j = 0; j < teams.length; j++)
				{
					if(teams[j].name == t1.name)
						team1_exists = true;
					if(teams[j].name == t2.name)
						team2_exists = true;
				}

				if (!team1_exists) {
                    teams.push(t1);
                    teams_by_group[data.matches[0].match[i].round.id].push(t1); //push team to any round if not pushed there before
                } else if (data.matches[0].match[i].round.round_mode.id == "2") {
                    teams_by_group[data.matches[0].match[i].round.id].push(t1); //push team into ko-round
                }
                if (!team2_exists) {
                    teams.push(t2);
                    teams_by_group[data.matches[0].match[i].round.id].push(t2); //push team to any round if not pushed there before
                } else if (data.matches[0].match[i].round.round_mode.id == "2") {
                    teams_by_group[data.matches[0].match[i].round.id].push(t2); //push team into ko-round
                }
			}
			// Vor dem einpflegen Home- und Away-Result raussuchen
			matchdays = parseInt(data.matches[0].match[i].matchday) + 1;
			
			var home_result = "";
			var away_result = "";
			var match_locked= "";
			if(data.matches[0].match[i].match_result != undefined && data.matches[0].match[i].finished == "yes")
			{
				match_locked = " readonly";
                for (var j = 0; j < data.matches[0].match[i].match_result.length; j++) {
                    if (data.matches[0].match[i].match_result[j].match_result_at == "0" && 
                        (data.matches[0].match[i].match_result[j].place == "home" || data.matches[0].match[i].match_result[j].place == "none_home"))
                        home_result = data.matches[0].match[i].match_result[j].match_result;
                    if (data.matches[0].match[i].match_result[j].match_result_at == "0" && 
                        (data.matches[0].match[i].match_result[j].place == "away" || data.matches[0].match[i].match_result[j].place == "none_away"))
                        away_result = data.matches[0].match[i].match_result[j].match_result;
                }
			}

			// Match-Tabelle oben bauen
			// Aktuelles Match in die Tabelle einfuegen
			if(data.matches[0].match[i].home.id && data.matches[0].match[i].home.name && data.matches[0].match[i].away.id && data.matches[0].match[i].away.name && data.matches[0].match[i].away.show_team == 'yes' && data.matches[0].match[i].home.show_team == 'yes')
			{
				html_string += 	"<tr id='wfb-tabcalc-home" + data.matches[0].match[i].home.id + "-away" + data.matches[0].match[i].away.id + "'>";
									if(i > 0)
									{
										//wenn matchdate anders ist als der Vorgänger dann darstellen
										if(data.matches[0].match[i].match_date != data.matches[0].match[i-1].match_date)
											html_string += "<td class='wfb-tabcalc-match-date'>" + data.matches[0].match[i].match_date + "</td>";
										else //wenn matchdate identisch mit Vorgänger dann nicht darstellen
											html_string += "<td class='wfb-tabcalc-match-date'></td>";
										//wenn match_time unknown, nicht darstellen
										if(data.matches[0].match[i].match_time != 'unknown')
											html_string += "<td class='wfb-tabcalc-match-time'>" + data.matches[0].match[i].match_time + "</td>";
										else
											html_string += "<td class='wfb-tabcalc-match-time'></td>";
									}
									else
									{
										//erstes Match hat keinen Vorgänger also immer bauen
										html_string += "<td class='wfb-tabcalc-match-date'>" + data.matches[0].match[i].match_date + "</td>";

										if(data.matches[0].match[i].match_time != 'unknown')
											html_string += "<td class='wfb-tabcalc-match-time'>" + data.matches[0].match[i].match_time + "</td>";
										else
											html_string += "<td class='wfb-tabcalc-match-time'></td>";
									}
				html_string += "<td class='wfb-tabcalc-name-home'>" + data.matches[0].match[i].home.name + "</td>" + 
									"<td class='wfb-tabcalc-logo-home'><img src='" + cdn_base + data.matches[0].match[i].home.id + ".gif' align='absmiddle' alt='" + data.matches[0].match[i].home.name + "' title='" + data.matches[0].match[i].home.name + "' /></td>" +
									"<td class='wfb-tabcalc-goals-home'><input type='number' pattern='^[0-9]+' min='0' class='wfb-tabcalc-home-goals wfb-tabcalc-home-goals-" + data.matches[0].match[i].home.id + "' maxlength='2' data-id='" + data.matches[0].match[i].home.id + "' value='" + home_result + "' " + match_locked + "></input></td>" +
									"<td class='wfb-tabcalc-divider'>:</td>" + 
									"<td class='wfb-tabcalc-goals-away'><input type='number' pattern='^[0-9]+' min='0' class='wfb-tabcalc-away-goals wfb-tabcalc-away-goals-" + data.matches[0].match[i].away.id + "' maxlength='2' data-id='" + data.matches[0].match[i].away.id + "' value='" + away_result + "' " + match_locked + "></input></td>" +
									"<td class='wfb-tabcalc-logo-away'><img src='" + cdn_base + data.matches[0].match[i].away.id + ".gif' align='absmiddle' alt='" + data.matches[0].match[i].away.name + "' title='" + data.matches[0].match[i].away.name + "' /></td>" +
									"<td class='wfb-tabcalc-name-away'>" + data.matches[0].match[i].away.name + "</td>" +
								"</tr>";
			}

		}

		//	Letzten Datensatz abschließen und anhängen
		html_string += "</tbody></table>";
		$("#wfb-tabcalc-matchdays").append(html_string);

		//	Navi einbinden
		$("#wfb-tabcalc-navi").html("");
		if(!is_tournament) 
		{
			var tab_width = 28;
			switch (matchdays)
			{
				case 47: tab_width = 23; break;
				case 46: tab_width = 23; break;
				case 45: tab_width = 24; break;
				case 44: tab_width = 24; break;
				case 43: tab_width = 25; break;
				case 42: tab_width = 25; break;
				case 41: tab_width = 26; break;
				case 40: tab_width = 26; break;
				default: tab_width = 28; break;
			}

			for(var g = 1; g < matchdays; g++)
				$("#wfb-tabcalc-navi").append("<div class='wfb-tabcalc-navi-day' id='wfb-tabcalc-navi-day-" + g + "' data-id='" + g + "' style='width: " + tab_width + "'>" + g + "</div>");
			$(".wfb-tabcalc-navi-day").addClass("tabwidth" + tab_width);
		}
		if(is_tournament) 
		{
			for (key in groups_arr)
				if (groups_arr[key]["has_table"] == true)
					$("#wfb-tabcalc-navi").append("<div class='wfb-tabcalc-navi-group' id='wfb-tabcalc-navi-group-" + groups_arr[key]["round_id"] + "' data-id='" + groups_arr[key]["round_id"] + "' data-round-order='" + groups_arr[key]["round_order"] + "'>" + key.split(" ")[1] + "</div>");
		}

		// Clickhandler für Navi
		// Liga
		if(!is_tournament) 
		{
			$(".wfb-tabcalc-navi-day").click(function(data){
				$(".wfb-tabcalc-navi-day").removeClass("active");
				$(data.target).addClass("active");
				$(".wfb-tabcalc-matchday").hide();
				cur_matchday = parseInt($(data.target));
				$("#wfb-tabcalc-matchday-" + parseInt($(data.target).html())).show();
				
				if(parseInt($(data.target).html()) == matchdays)
					$("#wfb-tabcalc-next-matchday").addClass("completed");
				else if(parseInt($(data.target).html()) == 1)
					$("#wfb-tabcalc-prev-matchday").addClass("completed");
				else {
					$("#wfb-tabcalc-prev-matchday").removeClass("completed");
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
				}
			});
		}
		// Gruppe
		if(is_tournament) 
		{
			$(".wfb-tabcalc-navi-group").click(function(e){
				$(".wfb-tabcalc-navi-group").removeClass("active");
				$(e.target).addClass("active");
				$(".wfb-tabcalc-group").hide();
				$("#wfb-tabcalc-group-" + parseInt($(e.target).attr('data-id'))).show();

				//wenn erster activ, dann blende prev aus und tue nichts
				if($(".wfb-tabcalc-navi-group").first().hasClass("active"))
				{
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
					$("#wfb-tabcalc-prev-matchday").addClass("completed");
				}
				//wenn letzter activ, dann blende next aus und tue nichts
				else if($(".wfb-tabcalc-navi-group").last().hasClass("active"))
				{
					$("#wfb-tabcalc-prev-matchday").removeClass("completed");
					$("#wfb-tabcalc-next-matchday").addClass("completed");
				}
				//wenn weder erster noch letzter active, dann blende prev und next ein
				else {
					$("#wfb-tabcalc-prev-matchday").removeClass("completed");
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
				}
		
				current_round_id = parseInt($(e.target).attr('data-id'));
				teams = teams_by_group[current_round_id];
				calcTable(data);
				teams_by_group[current_round_id] = teams;
				addLegend(data);
			});
		}
		// Clickhandler für den ">>"-Button
		// Liga
		if(!is_tournament)
		{
			$("#wfb-tabcalc-next-matchday").click(function(data){
				if(parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) < matchdays)
				{
					cur_matchday = parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) + 1;
					if(cur_matchday > 1) {
						$("#wfb-tabcalc-prev-matchday").removeClass("completed");
					}
					$(".wfb-tabcalc-navi-day").removeClass("active");
					$("#wfb-tabcalc-navi-day-" + cur_matchday).addClass("active");
					$(".wfb-tabcalc-matchday").hide();
					$("#wfb-tabcalc-matchday-" + cur_matchday).show();

					if(cur_matchday > (matchdays / 2))
					{
						$(".second-leg").show();
						$(".first-leg").hide();
					}
				}
				else{
					//Do-nothing
				}
				if(parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) == matchdays)
					$("#wfb-tabcalc-next-matchday").addClass("completed");
				else
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
			});
		}
		//Gruppe
		if(is_tournament) 
		{
			$("#wfb-tabcalc-next-matchday").click(function(e){
				//$("#wfb-tabcalc-prev-matchday").removeClass("completed");
				//wenn letzte Gruppe active ist tue nichts
				if($(".wfb-tabcalc-navi-group").last().hasClass("active"))
				{
					//Do-nothing
				}
				else
				{
					if($(".tabcalc-legende") != undefined);
					{
						$(".tabcalc-legende").remove();
					}

					if($(".wfb-tabcalc-navi-group").last().prev().hasClass("active")) {
						$("#wfb-tabcalc-next-matchday").addClass("completed");
						temp_round_id = parseInt($(".wfb-tabcalc-navi-group.active").attr("data-id"));
					}

					if($(".wfb-tabcalc-navi-group").first().hasClass("active")) {
						$("#wfb-tabcalc-prev-matchday").removeClass("completed");
					}
					cur_matchday = parseInt($(".wfb-tabcalc-navi-group.active").next().attr("data-id"));
					$(".wfb-tabcalc-navi-group").removeClass("active");
					$("#wfb-tabcalc-navi-group-" + cur_matchday).addClass("active");
					$(".wfb-tabcalc-group").hide();
					var take_next_round_id = false;
					for(key in groups_arr)
					{
						if(take_next_round_id && (groups_arr[key]["has_table"] == true))
						{
							current_round_id = groups_arr[key]["round_id"];
							break;
						}
						if(groups_arr[key]["round_id"] == current_round_id)
							take_next_round_id = true;
					}
					$("#wfb-tabcalc-group-" + cur_matchday).show();

					teams = teams_by_group[current_round_id];
					calcTable(data);
					teams_by_group[current_round_id] = teams;
					addLegend(data);
				}
			});
		}


		// Clickhandler für den "<<"-Button
		// Liga
		if(!is_tournament) {
			$("#wfb-tabcalc-prev-matchday").click(function(data){
				if($(".wfb-tabcalc-navi-day").last().hasClass("active"))
				{
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
				}
				if(cur_matchday != 1)
				{
					if(parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) <= matchdays)
					{
						cur_matchday = parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) - 1;
						$(".wfb-tabcalc-navi-day").removeClass("active");
						$("#wfb-tabcalc-navi-day-" + cur_matchday).addClass("active");
						$(".wfb-tabcalc-matchday").hide();
						$("#wfb-tabcalc-matchday-" + cur_matchday).show();

						if(cur_matchday <= (matchdays / 2))
						{
							$(".second-leg").hide();
							$(".first-leg").show();
						}
					}
					if(parseInt($(".wfb-tabcalc-navi-day.active").attr("data-id")) == 1)
						$("#wfb-tabcalc-prev-matchday").addClass("completed");
					else
						$("#wfb-tabcalc-prev-matchday").removeClass("completed");
				}
			});
		}
		// Gruppe <<
		if (is_tournament) 
		{
			$("#wfb-tabcalc-prev-matchday").click(function(e){

				// wenn der letzte active war, dann blende next ein
				if ($(".wfb-tabcalc-navi-group").last().hasClass("active")) {
					$("#wfb-tabcalc-next-matchday").removeClass("completed");
				}
				// wenn der zweite active war, dann blende prev aus
				if ($(".wfb-tabcalc-navi-group").first().next().hasClass("active")) {
					$("#wfb-tabcalc-prev-matchday").addClass("completed");
				}
				
				if (!$(".wfb-tabcalc-navi-group").last().hasClass("active"))
				{
					// wenn der erste active ist, dann tue nichts
					if($(".wfb-tabcalc-navi-group").first().hasClass("active"))
					{
						//Do-nothing
					}
					else
					{
						cur_matchday = parseInt($(".wfb-tabcalc-navi-group.active").prev().attr("data-id"));
						$(".wfb-tabcalc-navi-group").removeClass("active");
						$("#wfb-tabcalc-navi-group-" + cur_matchday).addClass("active");
						$(".wfb-tabcalc-group").hide();
						var take_next_round_id = false;
						for (key in groups_arr)
						{
							if (take_next_round_id && (groups_arr[key]["has_table"] == true))
							{
								current_round_id = groups_arr[key]["round_id"];
								break;
							}
							if(groups_arr[key]["round_id"] == current_round_id)
								take_next_round_id = true;
						}
						$("#wfb-tabcalc-group-" + cur_matchday).show();
						
						//current_round_id = (current_round_id - 2);
						current_round_id = parseInt($(".wfb-tabcalc-navi-group.active").attr("data-id"));
						if($(".tabcalc-legende") != undefined);
						{
							$(".tabcalc-legende").remove();
						}

					}
				}
				else
				{
					current_round_id = temp_round_id;

					cur_matchday = parseInt($(".wfb-tabcalc-navi-group.active").prev().attr("data-id"));
					$(".wfb-tabcalc-navi-group").removeClass("active");
					$("#wfb-tabcalc-navi-group-" + cur_matchday).addClass("active");
					$(".wfb-tabcalc-group").hide();
					$("#wfb-tabcalc-group-" + cur_matchday).show();

					if($(".tabcalc-legende") != undefined);
					{
						$(".tabcalc-legende").remove();
					}

				}
				teams = teams_by_group[current_round_id];
				calcTable(data);
				teams_by_group[current_round_id] = teams;
				addLegend(data);
			});
		}


		// Tabelle oben einfärben
		if(!is_tournament)
		{
			$("table.wfb-tabcalc-matchday tr:nth-child(2n+1)").addClass("hell");
			$("table.wfb-tabcalc-matchday tr:nth-child(2n+2)").addClass("dunkel");
		}
		if(is_tournament)
		{
			$("table.wfb-tabcalc-group tr:nth-child(2n+1)").addClass("hell");
			$("table.wfb-tabcalc-group tr:nth-child(2n+2)").addClass("dunkel");	
		}

		// Alle Spieltage in Hinrunde und Rückrunde aufteilen und in dieser Aufteilung darstellen
		$("<div id='wfb-tabcalc-first-leg' class='second-leg'><</div>").insertBefore("#wfb-tabcalc-navi-day-" + parseInt(matchdays / 2 + 1));
		$("<div id='wfb-tabcalc-second-leg' class='first-leg'>></div>").insertAfter("#wfb-tabcalc-navi-day-" + parseInt(matchdays / 2));
		
		matchdays--;
		for(var g = 0; g < (matchdays / 2); g++)
			$("#wfb-tabcalc-navi-day-" + (g+1)).addClass("first-leg");
		for(var g = (matchdays / 2); g < matchdays; g++)
			$("#wfb-tabcalc-navi-day-" + (g+1)).addClass("second-leg");
		
		$("#wfb-tabcalc-first-leg").click(function(data){
			$(".second-leg").hide();
			$(".first-leg").show();
		});
		$("#wfb-tabcalc-second-leg").click(function(data){
			$(".second-leg").show();
			$(".first-leg").hide();
		});

		// Initial eine der beiden Navigationsbuttons-Hälften ausblenden
		//nur bei Liga
		if(!is_tournament) {
			$(".second-leg").hide();
			$(".first-leg").show();
		}

		// Aktuellen Spieltag als aktiv setzen
		if(!is_tournament) {
			current_matchday = matchday_preset;	
			if(current_matchday <= (matchdays / 2))
			{
				$(".second-leg").hide();
				$(".first-leg").show();
			}
			else {
				$(".second-leg").show();
				$(".first-leg").hide();
			}	
		}
		if(is_tournament) {
			$("#wfb-tabcalc-navi .wfb-tabcalc-navi-group:nth-child(1)").addClass("active");
		}	

		$(".wfb-tabcalc-navi-day").removeClass("active");
		$("#wfb-tabcalc-navi-day-" + current_matchday).addClass("active");
		
		//	Alle Spieltage verstecken, danach den aktuellen wieder anzeigen (Liga)
		$(".wfb-tabcalc-matchday").hide();
		$("#wfb-tabcalc-matchday-" + current_matchday).show();

		//	Alle Gruppen verstecken, danach die erste Gruppe wieder anzeigen
		$(".wfb-tabcalc-group").hide();
		$(".wfb-tabcalc-group").first().show();
		if(is_tournament)
			current_round_id = $(".wfb-tabcalc-group").first().attr('id').split("wfb-tabcalc-group-")[1];

		if(is_tournament) {
			if(current_matchday > (matchdays / 2))
			{
				$(".second-leg").show();
				$(".first-leg").hide();
			}
			else
			{
				$(".second-leg").hide();
				$(".first-leg").show();
			}
		}

		// Refreshbutton
		$("#wfb-tabcalc-refresh").click(function(e){
            if (!is_tournament) {
                calcTable(data);
                addLegend(data);
            } else if (is_tournament) {
                teams = teams_by_group[current_round_id];
                calcTable(data);
                teams_by_group[current_round_id] = teams;
                addLegend(data);
            }
		});

		// Clearbutton (alle geaenderten Daten zuruecksetzen)
		$("#wfb-tabcalc-clear").click(function(e){
			$(":input:not([readonly='readonly'])").val("");
			calcTable(data);
			addLegend(data);
		});

		// Tabelle berechnen lassen
		if(!is_tournament)
		{
			calcTable(data);
			addLegend(data);
		}
		else if(is_tournament)
		{
			teams = teams_by_group[current_round_id];
			calcTable(data);
			teams_by_group[current_round_id] = teams;
			addLegend(data);
		}

        /*******************************/
        /*** KO-ROUND HANDLING START ***/
        /*******************************/
        var koRound = {
            //some helper params
            roundMatches: {},
            teamsByRoundID: {},
            matchRelations: {},
            dataByRoundID: {},            
            //init function called once
            init: function(matches,teamsByRound) {                
                var self = this;
                //init teams                    
                self.teamsByRoundID = teamsByRound;
                //init match relations
                self.initMatchRelations();
                //init data
                $.each(matches, function(index, match) {
                    //we need infos about all rounds and matches
                    //add round if not done yet
                    if(self.roundMatches[match.round.id] === null || self.roundMatches[match.round.id] === undefined) {
                        self.roundMatches[match.round.id] = { matches: [] };
                        //inject isFinished-function for a round
                        self.roundMatches[match.round.id].isFinished = function() {
                            var value = true;
                            $.each(self.roundMatches[match.round.id].matches, function(matchID, match) {
                                if(match.finished !== 'yes') {
                                    value = false;
                                    return value;
                                }
                            });
                            return value;
                        };
                    }
                    self.roundMatches[match.round.id].matches.push(match);
                    //skip group-matches / -rounds
                    if(match.round.round_mode.id == "1") {
                        return true;
                    }
                    //now handle ko-rounds
                    //add round if not done yet
                    if(self.dataByRoundID[match.round.id] === null || self.dataByRoundID[match.round.id] === undefined) {
                        self.dataByRoundID[match.round.id] = {
                            round: match.round
                        };
                        //inject isFinished-function for a round
                        self.dataByRoundID[match.round.id].round.isFinished = function() {
                            var value = true;
                            $.each(self.dataByRoundID[this.id].matches, function(matchID, match) {
                                if(match.finished === false) {
                                    value = false;
                                    return value;
                                }
                            });
                            return value;
                        };
                    }
                    //matches
                    if(self.dataByRoundID[match.round.id].matches === null || self.dataByRoundID[match.round.id].matches === undefined) {
                        self.dataByRoundID[match.round.id].matches = {};
                    }
                    //build new match-object by given match
                    //results
                    var resultHome = 0;
                    var resultAway = 0;
                    $.each(match.match_result, function(index, result) {
                        if(result.match_result_at == "0" && (result.place == "home" || result.place == "none_home")) {
                            resultHome = parseInt(result.match_result,10);  
                        }
                        if(result.match_result_at == "0" && (result.place == "away" || result.place == "none_away")) {
                            resultAway = parseInt(result.match_result,10);  
                        }
                    });
                    //setup match
                    var matchObject = {
                        id: match.id,
                        finished: (match.finished == 'yes') ? true : false,
                        matchDate: match.match_date,
                        matchTime: match.match_time,
                        roundOrder: match.round.round_order,
                        home: { id: match.home.id, name: match.home.name, result: resultHome },
                        away: { id: match.away.id, name: match.away.name, result: resultAway },
                        defaults: {
                            home: { id: match.home.id, name: match.home.name, result: resultHome },
                            away: { id: match.away.id, name: match.away.name, result: resultAway }
                        },
                        isFinished: function() { return this.finished; },
                        isDefaultTeam: function(type) {
                            return (this.defaults[type].id === 0) ? false : this.getTeam(type).id == this.defaults[type].id;                            
                        },
                        getMatchDate: function() { return this.matchDate; },
                        getMatchTime: function() { return this.matchTime; },
                        getName: function(type) { return this.getTeam(type).name; },
                        getIcon: function(type) {
                            //on finished ko-matches no changes of teams will be made, in this case just return icon of that team
                            //on unfinished ko-matches the current team should not be the default team because it would be a placeholder, if not return its icon
                            if(this.isFinished() || this.isDefaultTeam(type) === false) {
                                return $('<img>').prop('src',cdn_base+this[type].id+'.gif');
                            }
                            //on unfinished ko-matches the default team is a placeholder, so return no icon on default
                            return '';
                        },
                        getResult: function(type) {
                            var result = $('<input>').addClass('wfb-tabcalc-'+type+'-goals').val('').prop({'maxlength':2});
                            if(this.isFinished() || (this.isDefaultTeam('home') === false && this.isDefaultTeam('away') === false)) {
                                result.val(this[type].result).prop('readonly',false);
                                if(this.isFinished()) {
                                    result.prop('readonly',true);
                                } else {
                                    var self = this;
                                    result.on('change',function(e) {
                                        if(isNaN($(this).val()) || $(this).val() === '') {
                                            $(this).val(''); //if not a number, restore old value
                                            self[type].result = 0;
                                        } else {
                                            self[type].result = parseInt($(this).val(),10);
                                        }
                                    });
                                }
                            } else {
                                result.val('').prop('readonly',true);
                            }
                            return result;
                        }
                    };
                    //bind functions depending on round_order
                    switch(match.round.round_order) {
                        case '2':
                            matchObject.getTeam = function(type) {
                                //if match is finished just return it
                                if(this.isFinished()) {
                                    return this[type];
                                }
                                //if match isn't finished... get some indicators                                
                                var allRelatedMatchesBetted = false;
                                $.each(self.teamsByRoundID[self.matchRelations[this.id].roundIDs[type]],function(i,team){ 
                                    allRelatedMatchesBetted = (team.games === 3) ? true : false;
                                    return allRelatedMatchesBetted === true; 
                                });
                                var allRelatedMatchesFinished = self.roundMatches[self.matchRelations[this.id].roundIDs[type]].isFinished();
                                //if matches are betted and group isn't finished, use calculated table to fill up team
                                if(allRelatedMatchesBetted === true && allRelatedMatchesFinished === false) {
                                    var teamIndex = (type === 'home') ? 0 : 1; //set teamIndex (which team to pick first or second)
                                    if(this[type].id != self.teamsByRoundID[self.matchRelations[this.id].roundIDs[type]][teamIndex].id) {
                                        //the team to display has changed, in this case we reset any results
                                        this[type].result = this[type].result = '';
                                    }
                                    //pick related team as current team
                                    this[type].id = self.teamsByRoundID[self.matchRelations[this.id].roundIDs[type]][teamIndex].id;
                                    this[type].name = self.teamsByRoundID[self.matchRelations[this.id].roundIDs[type]][teamIndex].name;
                                } else if(allRelatedMatchesFinished === true) {
                                    //remove placeholder, so isDefaultTeam will return the correct value
                                    this.defaults[type].id = 0;
                                } else {
                                    //team shall be the default team because the match is unfinished and the related group-round too
                                    this[type].id = this.defaults[type].id;
                                    this[type].name = this.defaults[type].name;
                                    this.home.result = this.away.result = '';
                                }
                                //modifiy result if draw, this is not allowed in ko-rounds
                                if(this.home.result == this.away.result) {
                                    this.home.result = this.away.result = '';
                                }
                                return this[type];
                            };
                            break;
                        default:
                            matchObject.getTeam = function(type) {
                                //if match is finished just return
                                if(this.isFinished()) {
                                    return this[type];
                                }
                                //find related match
                                var relatedMatch = self.dataByRoundID[self.matchRelations[this.id].roundID].matches[self.matchRelations[this.id].matchIDs[type]];
                                //in one round we have to switch result handling, if we want the losers we just switch results of teams
                                var getWinner = (this.roundOrder == '5') ? false : true;
                                //get all relevant results
                                var results = {
                                    home: getWinner ? relatedMatch.getTeam('home').result : relatedMatch.getTeam('away').result,
                                    away: getWinner ? relatedMatch.getTeam('away').result : relatedMatch.getTeam('home').result
                                };
                                //if home team of related match wins return it
                                if(results.home > results.away) {
                                	this.defaults[type].id = 0;
                                    this[type].id = relatedMatch.getTeam('home').id;
                                    this[type].name = relatedMatch.getTeam('home').name;
                                } else if(results.home < results.away) {
                                	this.defaults[type].id = 0;
                                    this[type].id = relatedMatch.getTeam('away').id;
                                    this[type].name = relatedMatch.getTeam('away').name;
                                } else {
                                    this[type].id = this.defaults[type].id;
                                    this[type].name = this.defaults[type].name;
                                    this.home.result = this.away.result = '';
                                }
                                //modifiy result if draw, this is not allowed in ko-rounds
                                if(this.home.result == this.away.result) {
                                    this.home.result = this.away.result = '';
                                }
                                return this[type];
                            };
                            break;
                    }
                    //finally add match
                    self.dataByRoundID[match.round.id].matches[match.id] = matchObject;
                });                
                //add the missing ko-round-buttons and its listener
                if($('#wfb-tabcalc-navi wfb-tabcalc-navi-ko').length === 0) {
                    $('#wfb-tabcalc-navi').append('<div class="wfb-tabcalc-navi-ko">'+ko_title[locale]+'</div>');
                    //click-function for ko-round-button
                    $('#wfb-tabcalc-navi .wfb-tabcalc-navi-ko').on('click',function(e) {
                        current_round_id = $('.wfb-tabcalc-navi-group').last().data('id'); //fix current_round
                        $('#wfb-tabcalc-prev-matchday').removeClass('completed');
                        $('#wfb-tabcalc-next-matchday').addClass('completed');
                        $('.wfb-tabcalc-navi-group').removeClass('active');
                        $(this).addClass('active');
                        self.loadContent();
                    });
                }
                //setup additional listeners for existing nav-elements
                self.additionalNavListener();
                //check if the current round is a ko-round (force loading of ko-content if there is no active group or preset doesn't match any group-round
                if( $('.wfb-tabcalc-navi-group').hasClass('active') === false || self.dataByRoundID[round_preset] !== undefined) {
                    $('.wfb-tabcalc-navi-ko').trigger('click');
                }
                //setup additional content for group-rounds
                self.additionalGroupContent();
            },
            initMatchRelations: function() {
                var self = this;
                //achtelfinale (round-id = 25621)
                self.matchRelations[513316] = { roundIDs: { home: 25613, away: 25614 } }; //AF 1
                self.matchRelations[513317] = { roundIDs: { home: 25615, away: 25616 } }; //AF 2
                self.matchRelations[513318] = { roundIDs: { home: 25614, away: 25613 } }; //AF 3
                self.matchRelations[513319] = { roundIDs: { home: 25616, away: 25615 } }; //AF 4
                self.matchRelations[513320] = { roundIDs: { home: 25617, away: 25618 } }; //AF 5
                self.matchRelations[513321] = { roundIDs: { home: 25619, away: 25620 } }; //AF 6
                self.matchRelations[513327] = { roundIDs: { home: 25618, away: 25617 } }; //AF 7
                self.matchRelations[513322] = { roundIDs: { home: 25620, away: 25619 } }; //AF 8
                //viertelfinale (round-id = 25622)
                self.matchRelations[513329] = { roundID: 25621, matchIDs: { home: 513320, away: 513321} }; //VF 1
                self.matchRelations[513328] = { roundID: 25621, matchIDs: { home: 513316, away: 513317} }; //VF 2
                self.matchRelations[513330] = { roundID: 25621, matchIDs: { home: 513327, away: 513322} }; //VF 3
                self.matchRelations[513331] = { roundID: 25621, matchIDs: { home: 513318, away: 513319} }; //VF 4
                //halbfinale (round-id = 25623)
                self.matchRelations[513336] = { roundID: 25622, matchIDs: { home: 513329, away: 513328} }; //HF 1
                self.matchRelations[513337] = { roundID: 25622, matchIDs: { home: 513331, away: 513330} }; //HF 2
                //platz 3 (round-id = 25624)
                self.matchRelations[513338] = { roundID: 25623, matchIDs: { home: 513336, away: 513337} };
                //finale (round-id = 25625)
                self.matchRelations[513339] = { roundID: 25623, matchIDs: { home: 513336, away: 513337} };
            },
            loadContent: function() {
                var self = this;
                //hide or remove stuff we don't want here
                $('.tabcalc-legende').remove(); //remove legend if not done yet
                $('#wfb-tabcalc-standing-buttons-container').hide(); //hide default nav-bar
                $('#wfb-tabcalc-table-headline').hide(); //hide headline-container
                $('#wfb-tabcalc-table').hide(); //hide standing
                $('.wfb-tabcalc-group').hide(); //hide all content-groups
                //load each round
                var koRoundFinished = true; //remember either all ko-rounds are finished or not
                $.each(self.dataByRoundID, function(roundID, data) {
                    //update global finished status
                    if(parseInt(data.round.round_order,10) < 5 && data.round.isFinished() === false) {
                        koRoundFinished = false;
                    }
                    //load this round
                    self.loadRound(data);
                });
                //inject a global default nav-bar if no round is incomplete (or tournament is complete)
                if(koRoundFinished) {
                    self.loadRoundNavBar();
                }
            },
            loadRound: function(data,selector) {
                //only if round defined
                if(data.round === undefined) {
                    return;
                }
                //table of this round
                var self = this;
                //where to add/replace?
                var gameplanTable = $(selector);
                if(selector === undefined) {
                    gameplanTable = $('#wfb-tabcalc-group-'+data.round.id);
                }
                //clear matches, prevent duplicate ids
                $('tbody',gameplanTable).html(''); //sad but we have to clear content
                //load data for each match and add it to its table
                $.each(data.matches, function(matchID, match) {
                    self.loadMatch(match,data.round,selector);
                });
                //colorize matches before adding navbar
                $('tbody tr:nth-child(odd)',gameplanTable).removeClass('dunkel').addClass('hell');                
                //inject a headline if there is none
                if($('thead tr',gameplanTable).length === 0) {
                    var headline = $('<td>');
                    headline.prop('colspan',$('tbody tr:first-child td',gameplanTable).length);
                    headline.addClass('wfb-headline-ko-round');
                    headline.html(data.round.name);
                    $('thead',gameplanTable).html($('<tr>').html(headline));
                }
                //inject nav-bar for this round if the round isn't finished
                if(selector === undefined && parseInt(data.round.round_order,10) < 5 && data.round.isFinished() === false) { 
                    self.loadRoundNavBar(data.round);
                }
                //finally show this table
                gameplanTable.show();
            },
            loadMatch: function(match,round,selector) {
                //only if defined
                if(match === undefined) {
                    return;
                }
                //table of this round
                var self = this;
                //where to add/replace?
                var gameplanTable = $(selector);
                if(selector === undefined) {
                    gameplanTable = $('#wfb-tabcalc-group-'+round.id);
                }
                //setup date cells
                var matchDate = $('<td>').addClass('wfb-tabcalc-match-date');
                var matchTime = $('<td>').addClass('wfb-tabcalc-match-time');
                //compare last inserted match-date with current one, inject it if it differs or doesn't exists
                if($('tbody tr:last-child',gameplanTable).length === 1) {
                    if($('tbody tr:last-child td.wfb-tabcalc-match-date',gameplanTable).text() !== match.getMatchDate()) {
                        matchDate.html(match.getMatchDate());    
                    }
                } else {
                    matchDate.html(match.getMatchDate());
                }
                //inject match-time to cell if not unkown
                if(match.getMatchTime != 'unknown') {
                    matchTime.html(match.getMatchTime());
                }         
                //finally build complete row and inject it (by default as "dunkel", "hell" will be inject later)
                $('tbody',gameplanTable).append($('<tr>').addClass('dunkel').append(
                    matchDate,
                    matchTime,
                    $('<td>').addClass('wfb-tabcalc-name-home').html(match.getName('home')),
                    $('<td>').addClass('wfb-tabcalc-logo-home').css('height','23').html(match.getIcon('home')),
                    $('<td>').addClass('wfb-tabcalc-result-home').html(match.getResult('home')),
                    $('<td>').addClass('wfb-tabcalc-divider').html(':'),
                    $('<td>').addClass('wfb-tabcalc-result-away').html(match.getResult('away')),
                    $('<td>').addClass('wfb-tabcalc-logo-away').css('height','23').html(match.getIcon('away')),
                    $('<td>').addClass('wfb-tabcalc-name-away').html(match.getName('away'))
                ));
            },
            loadRoundNavBar: function(round) {
                var self = this;
                //setup buttons
                var prevButton = $('<div>').addClass('wfb-navbar-ko-round-button').addClass('prev').html('<<');
                var updateButton = $('<div>').addClass('wfb-navbar-ko-round-button').addClass('update').html($('#wfb-tabcalc-refresh').html());
                var clearButton = $('<div>').addClass('wfb-navbar-ko-round-button').addClass('clear').html($('#wfb-tabcalc-clear').html());
                var nextButton = $('<div>').addClass('wfb-navbar-ko-round-button').addClass('next completed').html('>>');               
                //if we have a round we bind round-data to update- and clear-button
                if(round !== undefined) {
                    updateButton.data('round',round);
                    clearButton.data('round',round);
                } else {
                    //in case of a global bar, if we don't have a round, we just add "hiding"-class, no props are needed
                    updateButton.addClass('completed');
                    clearButton.addClass('completed');
                }
                //build navbar and inject it                
                var gameplanTable = (round !== undefined) ? $('#wfb-tabcalc-group-'+round.id) : $('#wfb-tabcalc-matchdays table:last-child');
                if($('tbody tr:last-child .wfb-navbar-ko-round-container',gameplanTable).length === 0) {
                    var navbar = $('<td>').prop('colspan',$('tbody tr:first-child td',gameplanTable).length);
                    navbar.append($('<div>').addClass('wfb-navbar-ko-round-container').append(prevButton,updateButton,clearButton,nextButton));
                    $('tbody',gameplanTable).append($('<tr>').html(navbar));
                }
                //bind prevButton listener
                $('tbody .wfb-navbar-ko-round-button.prev',gameplanTable).off('click').on('click',function(e){
                    //delegate click / trigger a last group click
                    $('.wfb-tabcalc-navi-group').last().addClass('active'); //must be active, else its listener doesn't work
                    $('.wfb-tabcalc-navi-group').last().trigger('click');   
                });
                //bind updateButton and clearButton listener only if we have a round
                if(round !== undefined) {
                    //bind updateButton listener
                    $('tbody .wfb-navbar-ko-round-button.update',gameplanTable).off('click').on('click',function(e){
                        self.loadContent();
                    });
                    //bind clearButton listener
                    $('tbody .wfb-navbar-ko-round-button.clear',gameplanTable).off('click').on('click',function(e){
                        //clear results of current round
                        $.each(self.dataByRoundID[$(this).data().round.id].matches,function(matchID,match){
                            match.home.result = match.away.result = 0;
                        });
                        //following round will be recalculated, so just trigger reloading
                        self.loadContent();
                    });
                }
                //no need to bind nextButton listener, should always be inactive                
            },
            additionalNavListener: function() {
                //loaded once per init, only adds some extra functions to existing events (don't unbind existing events)
                var self = this;
                //additional click-function for existing group-buttons
                $('#wfb-tabcalc-navi .wfb-tabcalc-navi-group').on('click',function(e) {
                    $('#wfb-tabcalc-next-matchday').removeClass('completed');
                    $('.wfb-tabcalc-navi-ko').removeClass('active');
                    $('.tabcalc-legende').remove(); //remove legend if not done yet
                    $('#wfb-tabcalc-standing-buttons-container').show(); //show default nav-bar
                    $('#wfb-tabcalc-table-headline').show(); //show headline-container
                    $('#wfb-tabcalc-table').show(); // standing
                });
                //additional click-function for existing prev-buttons
                $('#wfb-tabcalc-prev-matchday').on('click',function(e) {
                    if($('.wfb-tabcalc-navi-ko').hasClass('active')) {
                        $('.wfb-tabcalc-navi-group').last().addClass('active'); //must be active, else its listener doesn't work
                        $('.wfb-tabcalc-navi-group').last().trigger('click');    
                    }
                    //remove legend if not done yet
                    $('.tabcalc-legende').remove();                   
                });
                //additional click-function for existing next-buttons
                $('#wfb-tabcalc-next-matchday').on('click',function(e) {
                    if($('.wfb-tabcalc-navi-group').last().hasClass('active') && $(this).hasClass('completed') === false) {
                        $('.wfb-tabcalc-navi-ko').trigger('click');
                        return;
                    } else if($('.wfb-tabcalc-navi-ko').hasClass('active') && $(this).hasClass('completed') === true) {
                        $('.wfb-tabcalc-navi-ko').trigger('click');
                        return;
                    }
                    $(this).removeClass('completed');
                    //remove legend if not done yet
                    $('.tabcalc-legende').remove();
                });                
            },
            additionalGroupContent: function() {
                var self = this;
                var selector = '#wfb-tabcalc-ko table';
                var relatedRound = 25621;
                //returning if related round is undefined
                if(self.dataByRoundID[relatedRound] === undefined) {
                    return;
                }
                //first init
                self.loadRound(self.dataByRoundID[relatedRound],selector);
                if($('.wfb-tabcalc-navi-ko').hasClass('active') === true) {
                    $(selector).hide();    
                } else {
                    $(selector).show();
                }
                //additional listeners
                $('#wfb-tabcalc-navi .wfb-tabcalc-navi-group').on('click',function(e) {
                    self.loadRound(self.dataByRoundID[relatedRound],selector);
                    $(selector).show();
                });
                $('#wfb-tabcalc-refresh').on('click',function(e) {
                    self.loadRound(self.dataByRoundID[relatedRound],selector);
                    $(selector).show();
                });
                $('#wfb-tabcalc-clear').on('click',function(e) {
                    self.loadRound(self.dataByRoundID[relatedRound],selector);
                    $(selector).show();
                });
                $('#wfb-tabcalc-next-matchday').on('click',function(e) {
                    if($('.wfb-tabcalc-navi-ko').hasClass('active') && $(this).hasClass('completed') === true) {
                        self.loadRound(self.dataByRoundID[relatedRound],selector);
                        $(selector).hide();
                    }
                });
                $('#wfb-tabcalc-navi .wfb-tabcalc-navi-ko').on('click',function(e) {
                    self.loadRound(self.dataByRoundID[relatedRound],selector);
                    $(selector).hide();
                });
            }

        };
        //only add ko-round for certain competitions
        if(competition_id == '139') {
            //remove legend
            $('.tabcalc-legende').remove();
            //load with matches and teams_by_group, don't care about other data
            koRound.init(data.matches[0].match,teams_by_group);
        }
        /*****************************/
        /*** KO-ROUND HANDLING END ***/
        /*****************************/
			
	});

	// Tabelleninhalt berechnen
	function calcTable(data)
	{
		if(typeof teams === 'undefined') {
            return;
        }
		if($(".tabcalc-legende") !== undefined) {
			$(".tabcalc-legende").remove();
		}
		// Momentanen Daten wipen
		for(var i = 0; i < teams.length; i++)
		{
			if (teams[i].id == 1868 && season_id == 18337)
			{
				teams[i].points 		= -3;
			}
			else
			{
				teams[i].points 		= 0;
			}
			teams[i].goals 			= 0;
			teams[i].goals_against 	= 0;
			teams[i].games 			= 0;
			teams[i].won 			= 0;
			teams[i].draw 			= 0;
			teams[i].lost 			= 0;
			teams[i].rank 			= 1;
		}

		// Neue Daten eintragen (Liga)
		if(!is_tournament)
		{
			for(var i = 1; i < matchdays + 1; i++)
			{
				var nr_of_matches_this_matchday = $("#wfb-tabcalc-matchday-" + i + " tr").length;
				var nr_of_matches_completed		= 0;

				$.each($("#wfb-tabcalc-matchday-" + i + " tbody tr"), function(k, v) {

					// ID der Teams im Array finden
					var t1 = null;
					var t2 = null;

					for(var j = 0; j < teams.length; j++)
					{
						if(teams[j].id == parseInt($(v).find(".wfb-tabcalc-goals-home input").attr("data-id")))
							t1 = j;
						if(teams[j].id == parseInt($(v).find(".wfb-tabcalc-goals-away input").attr("data-id")))
							t2 = j;
					}

					if($(v).find(".wfb-tabcalc-goals-home input").val() != "" && $(v).find(".wfb-tabcalc-goals-away input").val() != "")
					{
						nr_of_matches_completed++;

						// Abfangen von ungültigen Eingaben
						if(isNaN(parseInt($(v).find(".wfb-tabcalc-goals-home input").val())))
							$(v).find(".wfb-tabcalc-goals-home input").val("0");
						if(isNaN(parseInt($(v).find(".wfb-tabcalc-goals-away input").val())))
							$(v).find(".wfb-tabcalc-goals-away input").val("0");
						if(parseInt($(v).find(".wfb-tabcalc-goals-home input").val()) < 0)
							$(v).find(".wfb-tabcalc-goals-home input").val("0");
						if(parseInt($(v).find(".wfb-tabcalc-goals-away input").val()) < 0)
							$(v).find(".wfb-tabcalc-goals-away input").val("0");

						teams[t1].games++;
						teams[t2].games++;

						t1goals 			= parseInt($(v).find(".wfb-tabcalc-goals-home input").val());
						t2goals_against 	= parseInt($(v).find(".wfb-tabcalc-goals-home input").val());
						t2goals 			= parseInt($(v).find(".wfb-tabcalc-goals-away input").val());
						t1goals_against 	= parseInt($(v).find(".wfb-tabcalc-goals-away input").val());

						if(t1goals > t2goals)
						{
							teams[t1].points += points_per_win;
							teams[t1].won++;
							teams[t2].lost++;
						}
						else if(t1goals < t2goals)
						{
							teams[t2].points += points_per_win;
							teams[t2].won++;
							teams[t1].lost++;
						}
						else
						{
							teams[t1].points += points_per_draw;
							teams[t2].points += points_per_draw;
							teams[t1].draw++;
							teams[t2].draw++;
						}

						teams[t1].goals 		+= t1goals;
						teams[t1].goals_against += t1goals_against;
						teams[t2].goals 		+= t2goals;
						teams[t2].goals_against += t2goals_against;
					}

				});

				if(nr_of_matches_completed == nr_of_matches_this_matchday)
				{
					$("#wfb-tabcalc-navi-day-" + i).addClass("completed");
				}
			}
		}
		else if(is_tournament)
		{
			var nr_of_matches_this_matchday = $("#wfb-tabcalc-group-" + current_round_id + " tr").length;
			var nr_of_matches_completed		= 0;

			$.each($("#wfb-tabcalc-group-" + current_round_id + " tbody tr"), function(k, v) {

				// ID der Teams im Array finden
				var t1 = null;
				var t2 = null;

				for(var j = 0; j < teams.length; j++)
				{
					if(teams[j].id == parseInt($(v).find(".wfb-tabcalc-goals-home input").attr("data-id")))
						t1 = j;
					if(teams[j].id == parseInt($(v).find(".wfb-tabcalc-goals-away input").attr("data-id")))
						t2 = j;
				}

				if($(v).find(".wfb-tabcalc-goals-home input").val() != "" && $(v).find(".wfb-tabcalc-goals-away input").val() != "")
				{
					nr_of_matches_completed++;

					// Abfangen von ungültigen Eingaben
					if(isNaN(parseInt($(v).find(".wfb-tabcalc-goals-home input").val())))
						$(v).find(".wfb-tabcalc-goals-home input").val("0");
					if(isNaN(parseInt($(v).find(".wfb-tabcalc-goals-away input").val())))
						$(v).find(".wfb-tabcalc-goals-away input").val("0");
					if(parseInt($(v).find(".wfb-tabcalc-goals-home input").val()) < 0)
						$(v).find(".wfb-tabcalc-goals-home input").val("0");
					if(parseInt($(v).find(".wfb-tabcalc-goals-away input").val()) < 0)
						$(v).find(".wfb-tabcalc-goals-away input").val("0");

					teams[t1].games++;
					teams[t2].games++;

					t1goals 			= parseInt($(v).find(".wfb-tabcalc-goals-home input").val());
					t2goals_against 	= parseInt($(v).find(".wfb-tabcalc-goals-home input").val());
					t2goals 			= parseInt($(v).find(".wfb-tabcalc-goals-away input").val());
					t1goals_against 	= parseInt($(v).find(".wfb-tabcalc-goals-away input").val());

					if(t1goals > t2goals)
						{
							teams[t1].points += points_per_win;
							teams[t1].won++;
							teams[t2].lost++;
						}
						else if(t1goals < t2goals)
						{
							teams[t2].points += points_per_win;
							teams[t2].won++;
							teams[t1].lost++;
						}
						else
						{
							teams[t1].points += points_per_draw;
							teams[t2].points += points_per_draw;
							teams[t1].draw++;
							teams[t2].draw++;
						}

					teams[t1].goals 		+= t1goals;
					teams[t1].goals_against += t1goals_against;
					teams[t2].goals 		+= t2goals;
					teams[t2].goals_against += t2goals_against;
				}

			});

			if(nr_of_matches_completed == nr_of_matches_this_matchday)
			{
				$("#wfb-tabcalc-navi-day-" + i).addClass("completed");
			}
		}

		//table-sorting
        if(competition_id == '139') {
            teams = sortByWMRules(teams);
        } else if (is_tournament) {
            teams.sort(sortDFBRules);
            teams.sort(sortTournamentRules);
			var games_played = false;
			for(var f = 0; f < teams.length; f++)
				if(teams[f].games != 0)
					games_played = true;
			for(var f = 0; f < teams.length; f++)
				if(f + 1 < teams.length && games_played)
				{
					// TO DO: Hier wenn Punkte gleich sind und Tordifferenz?!
					if(teams[f].points == teams[f+1].points && (teams[f].goals - teams[f].goals_against) == (teams[f+1].goals - teams[f+1].goals_against))
						teams[f+1].rank = "";
					else
						teams[f+1].rank = f+2;
					if(teams[f].rank != "")
						teams[f].rank = f+1;
				}
        } else {
            teams.sort(sortDFBRules);
        }
		
		//Aufbau der unteren Tabelle
		
		//	Remove all Table entries, excluding the title bar
		$("#wfb-tabcalc-table table tr:not(:first)").remove();
		if(!is_tournament) {
			for(var f = 0; f < teams.length; f++){
				$("#wfb-tabcalc-table table").append("<tr class='color_id" + getColor(data, f) + "'>" +
					"<td>" + (f+1) + "</td>" +
					"<td class='wfb-tabcalc-standing-logo'><img src='" + cdn_base + teams[f].id + ".gif' align='absmiddle' alt='" + teams[f].name + "' title='" + teams[f].name + "' /></td>" +
					"<td class='wfb-tabcalc-standing-team'>" + teams[f].name + "</td>" +
					"<td>" + teams[f].games + "</td>" +
					"<td>" + teams[f].won + "</td>" +
					"<td>" + teams[f].draw + "</td>" +
					"<td>" + teams[f].lost + "</td>" +
					"<td>" + teams[f].goals + ":" + teams[f].goals_against + "</td>"+
					"<td>" + (teams[f].goals - teams[f].goals_against) + "</td>" +
					"<td>" + teams[f].points + "</td>");
			}
		}
		else if(is_tournament) {
			for(var f = 0; f < teams.length; f++){
				html_string = '';
				html_string += "<tr class='color_id" + getColor(data, f) + "'>";

				if(f > 0)
				{
					if(teams[f].rank == teams[f-1].rank)
						html_string += "<td></td>";
					else
						html_string += "<td>" + teams[f].rank + "</td>";
				}
				else
					html_string += "<td>" + teams[f].rank + "</td>";

				html_string += "<td class='wfb-tabcalc-standing-logo'><img src='" + cdn_base + teams[f].id + ".gif'></td>" +
				"<td class='wfb-tabcalc-standing-team'>" + teams[f].name + "</td>" +
				"<td>" + teams[f].games + "</td>" +
				"<td>" + teams[f].won + "</td>" +
				"<td>" + teams[f].draw + "</td>" +
				"<td>" + teams[f].lost + "</td>" +
				"<td>" + teams[f].goals + ":" + teams[f].goals_against + "</td>"+
				"<td>" + (teams[f].goals - teams[f].goals_against) + "</td>" +
				"<td>" + teams[f].points + "</td>";

				$("#wfb-tabcalc-table table").append(html_string);
			}
		}
	}

    // Zusaetzliches Sortieren bei einem Turnier
    function sortByWMRules(teams)
    {
        teams.sort(sortWMSubset);
        var teamSubsets = {};
        $.each(teams,function(index,team){
            var key = 'P'+parseInt(team.points,10)+'_D'+parseInt((team.goals - team.goals_against),10)+'_G'+parseInt(team.goals,10)
            if(teamSubsets[key] === null || teamSubsets[key] === undefined) {
                teamSubsets[key] = [];    
            }
            teamSubsets[key].push({ id: team.id, name: team.name, points: 0, goals: 0, goals_against: 0, rank_same: false });
        });
        $.each(teamSubsets,function(key,teamSubset){
            if(teamSubset.length <= 1) {
                return true;
            } else {
                $.each(teamSubset,function(i,teamA){
                    $.each(teamSubset,function(j,teamB){
                        if(i !== j) {
                            if((element = $('#wfb-tabcalc-home'+teamA.id+'-away'+teamB.id)).length == 1) {
                                var teamAGoals = parseInt($('.wfb-tabcalc-home-goals',element).val(),10);
                                var teamBGoals = parseInt($('.wfb-tabcalc-away-goals',element).val(),10);
                                if(isNaN(teamAGoals) || isNaN(teamBGoals)) {
                                    return true;
                                }
                                teamA.goals += teamAGoals;
                                teamA.goals_against += teamBGoals;
                                teamB.goals += teamBGoals;        
                                teamB.goals_against += teamAGoals;                
                                if(teamAGoals > teamBGoals) {
                                    teamA.points+=3;
                                } else if((teamAGoals < teamBGoals)) {
                                    teamB.points+=3;
                                } else {
                                    teamA.points++;
                                    teamB.points++;
                                }
                                teamSubsets[key][i] = teamA;
                                teamSubsets[key][j] = teamB;
                            }
                        }
                    });
                });
                teamSubsets[key] = teamSubsets[key].sort(sortWMSubset);
            }
        });
        //rebuild teams by sets (sets should be in correct order by initial sorting)
        var newTeams = [];
        var rank = 0;
        $.each(teamSubsets,function(keyA,teamSubset) {
            $.each(teamSubset,function(keyB,subsetTeam){
                $.each(teams,function(index,team){
                    if(subsetTeam.id === team.id) {
                        if(teamSubset.length == 1 || keyB == 0 || (keyB > 0 && team.rank_same === false) ) {
                            rank++;
                        }
                        team.rank = rank;
                        newTeams.push(team);
                    }
                });
            });
        });
        //returning new sorted teams
        return newTeams;
    }
    function sortWMSubset(a,b) {
        //will be called with all teams or subsets of teams
        a.rank_same = b.rank_same = false;

        // 1) by points
        if (a.points > b.points)
            return -1;
        else if (a.points < b.points)
            return 1;

        // 2) by total difference
        if((a.goals-a.goals_against) > (b.goals-b.goals_against))
            return -1
        else if((a.goals-a.goals_against) < (b.goals-b.goals_against))
            return 1;

        // 3) by total goals
        if(a.goals > b.goals)
            return -1
        else if(a.goals < b.goals)
            return 1;
        
        //last rule: by name
        a.rank_same = b.rank_same = true;
        return a.name.localeCompare(b.name);
    }

	function sortTournamentRules(a, b)
	{
		if(a.games == 0 && b.games == 0)
			return a.name.localeCompare(b.name);
		return 0;
	}

	// Sortieren der Tabelle nach DFB-Regelwerk
	function sortDFBRules(a, b)
	{
		if(a.points > b.points)
			return -1;
		else if(a.points < b.points)
			return 1;
		else	// Gleich viele Punkte --> Vergleich nach Tordifferenz
		{
			if((a.goals - a.goals_against) > (b.goals - b.goals_against))
				return -1
			else if((a.goals - a.goals_against) < (b.goals - b.goals_against))
				return 1;
			else	// Gleiche Tordifferenz --> Vergleich nach geschossenen Toren
			{
				if((a.goals) > (b.goals))
					return -1;
				else if((a.goals) < (b.goals))
					return 1;
				else	// Gleiche Tordifferenz --> Direkter Vergleich beider Spiele
				{
					//	Die beiden Tabellenreihen finden, die das Hin- und Rückspiel darstellen
					var team1goals = 0;
					var team2goals = 0;
					var team1goals_auswaerts = 0;
					var team2goals_auswaerts = 0;

					// Hinspiel
					if($("#wfb-tabcalc-home" + a.id + "-away" + b.id + " td .wfb-tabcalc-home-goals").val() != "")
						team1goals += parseInt($("#wfb-tabcalc-home" + a.id + "-away" + b.id + " td .wfb-tabcalc-home-goals").val());
					if($("#wfb-tabcalc-home" + a.id + "-away" + b.id + " td .wfb-tabcalc-away-goals").val() != "")
					{
						team2goals += parseInt($("#wfb-tabcalc-home" + a.id + "-away" + b.id + " td .wfb-tabcalc-away-goals").val());
						team2goals_auswaerts = parseInt($("#wfb-tabcalc-home" + a.id + "-away" + b.id + " td .wfb-tabcalc-away-goals").val());
					}

					// Rückspiel
					if($("#wfb-tabcalc-home" + b.id + "-away" + a.id + " td .wfb-tabcalc-home-goals").val() != "")
						team2goals += parseInt($("#wfb-tabcalc-home" + b.id + "-away" + a.id + " td .wfb-tabcalc-home-goals").val());
					if($("#wfb-tabcalc-home" + b.id + "-away" + a.id + " td .wfb-tabcalc-away-goals").val() != "")
					{
						team1goals += parseInt($("#wfb-tabcalc-home" + b.id + "-away" + a.id + " td .wfb-tabcalc-away-goals").val());
						team1goals_auswaerts = parseInt($("#wfb-tabcalc-home" + b.id + "-away" + a.id + " td .wfb-tabcalc-away-goals").val());
					}

					if(team1goals > team2goals)
						return -1;
					else if(team1goals < team2goals)
						return 1;
					else	// Unentschieden im direkten Vergleich --> auswärts erzielte Tore im direkten Vergleich
					{
						if(team1goals_auswaerts > team2goals_auswaerts)
							return -1;
						else if(team1goals_auswaerts < team2goals_auswaerts)
							return 1;
						else	// Gleichviele Tore auswärts im direkten Vergleich geschossen --> alle auswärts erzielten Tore der Liga
						{
							var team1goals_auswaerts_alle = 0;
							var team2goals_auswaerts_alle = 0;

							if($(".wfb-tabcalc-away-goals-" + a.id).val() != "")
								team1goals_auswaerts_alle += parseInt($(".wfb-tabcalc-away-goals-" + a.id).val());
							if($(".wfb-tabcalc-away-goals-" + b.id).val() != "")
								team2goals_auswaerts_alle += parseInt($(".wfb-tabcalc-away-goals-" + b.id).val());

							if(team1goals_auswaerts_alle > team2goals_auswaerts_alle)
								return -1;
							else if(team1goals_auswaerts_alle < team2goals_auswaerts_alle)
								return 1;
							else
								return 0;
						}
					}
				}
			}
		}
	}

	// Neues Team Objekt anlegen
	function newTeam()
	{
		o = new Object();
		o.name 			= "No Name";
		o.id 			= null;
		o.goals 		= 0;
		o.goals_against = 0;
		o.points		= 0;
		o.games 		= 0;
		o.win 			= 0;
		o.draw 			= 0;
		o.lost			= 0;
		o.rank 			= "norank";
		return o;
	}

	function getColor(data, f)
	{
		if(data.standings)
		{
			var rm = data.rm_stripped;
			var rk = parseInt(data.standings[0].standing[f].rank);

			if(rm != undefined)
			{
				for(var i=0; i < rm.length; i++)
				{
					if((f+1) >= parseInt(rm[i].from) && (f+1) <= parseInt(rm[i].to))
						return rm[i].colour_id;
				}
				return 0;
			}
		}
	}

	function getLegendColor(data, y)
	{
		if(data.standings)
		{
			var rmc = data.rm_stripped;

			if(rmc != undefined)
			{
					return rmc[y].colour_id;
			}
		}
	}

	function addLegend(data)
	{
		if(data.standings[0].round_marker)
		{
			$("#wfb-tabcalc-content").append("<table class='tabcalc-legende'><tbody></tbody></table>");
			var rml = data.rm_stripped;

			if(rml != undefined)
			{
				for(var y = 0; y < rml.length; y++)
				{
					$(".tabcalc-legende tbody").append("<tr><td width='10%' class='color_id"+ getLegendColor(data, y) + " wfb-legend-bar'></td><td>" + rml[y].comment + "</td></tr>");
				}
			}
		}
		else {
			$(".wfb-tabcalc-standing-table").css("border-bottom", "1px solid #9bcaf3");
		}
	}

});
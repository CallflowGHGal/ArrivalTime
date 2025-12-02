using ArrivalTime.Models;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Cors;



namespace ArrivalTime.Controllers
{
    [EnableCors(origins: "*", headers: "*", methods: "*")]
    [RoutePrefix("api/extensions/ArrivalTime")]
    public class ArrivalTimeController : ApiController
    {
        // GET api/extensions/ArrivalTime/GetProcessArrivalTimes?processesId=1&processesId=2
        [HttpGet]
        [Route("GetProcessArrivalTimes")]
        public async Task<IHttpActionResult> ArrivalTimeGet([FromUri] List<int> processesId = null)
        {
            processesId = processesId ?? new List<int>();
            if (!processesId.Any())
                return BadRequest("Please provide one or more process IDs (e.g. ?processesId=1&processesId=2).");

            // Build CSV string expected by your stored procedure: "17,18,19"
            var csv = string.Join(",", processesId);

            var connStr = ConfigurationManager.ConnectionStrings["QFlowDb"]?.ConnectionString;
            if (string.IsNullOrWhiteSpace(connStr))
                return InternalServerError(new ConfigurationErrorsException("Connection string 'QFlowDb' not found."));

            var results = new List<ProcessArrivalDto>();

            try
            {
                using (SqlConnection conn = new SqlConnection(connStr))
                using (var cmd = new SqlCommand("cqf.GetProcessArrivalTimes", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    // NVARCHAR(MAX) parameter
                    var p = cmd.Parameters.Add("@ProcessIdList", SqlDbType.NVarChar, -1);
                    p.Value = csv;

                    await conn.OpenAsync().ConfigureAwait(false);

                    using (var rdr = await cmd.ExecuteReaderAsync().ConfigureAwait(false))
                    {
                        while (await rdr.ReadAsync().ConfigureAwait(false))
                        {
                            ProcessArrivalDto dto = new ProcessArrivalDto
                            {
                                ProcessId = rdr["ProcessId"] != DBNull.Value ? (int)rdr["ProcessId"] : 0,
                                ArrivalTime = rdr["ArrivalTime"] != DBNull.Value ? rdr["ArrivalTime"].ToString() : null
                            };
                            results.Add(dto);
                        }
                    }
                }

                return Ok(results);
            }
            catch (SqlException ex)
            {
                // Optionally log
                return InternalServerError(ex);
            }
        }
    }

}

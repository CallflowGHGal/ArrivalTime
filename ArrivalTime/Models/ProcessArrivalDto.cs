namespace ArrivalTime.Models
{
    public class ProcessArrivalDto
    {
        public int ProcessId { get; set; }
        public string ArrivalTime { get; set; } // "HH:mm" or null
    }
}
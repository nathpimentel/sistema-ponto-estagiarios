using backend.DTOs;

namespace backend.Helpers;

public static class ResponseHelper
{
    public static ApiResponse<T> Success<T>(
        T data,
        string message = "Operação realizada com sucesso."
    )
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<object> Error(
        string message
    )
    {
        return new ApiResponse<object>
        {
            Success = false,
            Message = message,
            Data = null
        };
    }
}
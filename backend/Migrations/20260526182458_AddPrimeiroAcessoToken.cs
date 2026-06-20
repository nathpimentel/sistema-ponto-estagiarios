using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPrimeiroAcessoToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrimeiroAcessoToken",
                table: "Academicos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PrimeiroAcessoTokenExpiraEm",
                table: "Academicos",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrimeiroAcessoToken",
                table: "Academicos");

            migrationBuilder.DropColumn(
                name: "PrimeiroAcessoTokenExpiraEm",
                table: "Academicos");
        }
    }
}
